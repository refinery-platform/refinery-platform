from datetime import date
import logging
import os
import time

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction

import botocore
import celery
from celery.task import task
import pysam
import tempfile

from core.models import DataSet, ExtendedGroup, FileStoreItem
from file_store.models import FileExtension, generate_file_source_translator
from file_store.tasks import FileImportTask, download_s3_object, \
                                copy_file_object

from .isa_tab_parser import IsaTabParser
from .models import Investigation, Node, initialize_attribute_order
from .utils import (calculate_checksum, get_node_types, index_annotated_nodes,
                    update_annotated_nodes)

logger = logging.getLogger(__name__)


@task()
def create_dataset(investigation_uuid, username, identifier=None, title=None,
                   dataset_name=None, slug=None, public=False):
    """creates (or updates) a dataset with the given investigation and user and
    returns the dataset UUID or None if something went wrong
    Parameters:
    investigation_uuid: UUID of the investigation that's being assigned to the
    dataset
    username: username of the user this dataset will belong to
    identifier: If not None, this will be used as the identifier of the data
    set.
    title: If not None, this will be
    public: boolean value that determines if the dataset is public or not
    """
    # get User for assigning DataSets
    try:
        user = User.objects.get(username__exact=username)
    except:
        logger.info(
            "create_dataset: User %s doesn't exist, so creating User %s with "
            "password 'test'", username, username)
        # user doesn't exist
        user = User.objects.create_user(username, "", "test")
    if investigation_uuid is None:
        return None  # TODO: make sure this is never happens

    dataset = None
    try:
        investigation = Investigation.objects.get(uuid=investigation_uuid)
    except (Investigation.DoesNotExist,
            Investigation.MultipleObjectsReturned) as e:
        logger.error(
            'Did not get Investigation for uuid %s: %s',
            investigation_uuid, e)
    if identifier is None:
        identifier = investigation.get_identifier()
    if title is None:
        title = investigation.get_title()
    if dataset_name is None:
        dataset_name = "%s: %s" % (identifier, title)

    logger.info(
        "create_dataset: title = %s, identifer = %s, dataset_name = '%s'",
        title, identifier, dataset_name)

    datasets = DataSet.objects.filter(name=dataset_name)
    # check if the investigation already exists
    # if not 0, update dataset with new investigation
    if len(datasets):
        """go through datasets until you find one with the correct owner"""
        for ds in datasets:
            own = ds.get_owner()
            if own == user:
                ds.update_investigation(investigation,
                                        "updated %s" % date.today())
                logger.info("create_dataset: Updated data set %s", ds.name)
                dataset = ds
                break
    # create a new dataset if doesn't exist already for this user
    if not dataset:
        dataset = DataSet.objects.create(name=dataset_name)
        dataset.set_investigation(investigation)
        dataset.set_owner(user)
        dataset.accession = identifier
        dataset.title = title
        logger.info("create_dataset: Created data set '%s'", dataset_name)
    if public:
        public_group = ExtendedGroup.objects.public_group()
        dataset.share(public_group)
    annotate_nodes(investigation_uuid)
    # set dataset slug
    dataset.slug = slug
    # calculate total number of files and total number of bytes
    dataset.file_size = dataset.get_file_size()
    dataset.file_count = dataset.get_file_count()
    dataset.save()
    return dataset.uuid


@task()
def annotate_nodes(investigation_uuid):
    """Adds all nodes in this investigation to the annotated nodes table for
    faster lookup
    """
    try:
        investigation = Investigation.objects.get(uuid=investigation_uuid)
    # will fail immediately after this if DNE or MOR
    except (Investigation.DoesNotExist,
            Investigation.MultipleObjectsReturned) as e:
        logger.error(
            'Did not get Investigation for uuid %s:  %s',
            investigation_uuid, e)

    studies = investigation.study_set.all()

    for study in studies:
        assays = study.assay_set.all()

        for assay in assays:
            node_types = get_node_types(
                study.uuid,
                assay.uuid,
                files_only=True,
                filter_set=Node.FILES
            )

            for node_type in node_types:
                update_annotated_nodes(
                    node_type,
                    study.uuid,
                    assay.uuid,
                    update=True
                )

                index_annotated_nodes(node_type, study.uuid, assay.uuid)

            # initialize attribute order for this assay
            initialize_attribute_order(study, assay)


@task()
def parse_isatab(username, public, path, identity_id=None,
                 additional_raw_data_file_extension=None, isa_archive=None,
                 pre_isa_archive=None, file_base_path=None, overwrite=False,
                 existing_data_set_uuid=None):
    """parses in an ISA-TAB file to create database entries and creates or
    updates a dataset for the investigation to belong to; returns the dataset
    UUID or None if something went wrong. Use like this: parse_isatab(username,
    is_public, folder_name, additional_raw_data_file_extension,
    isa_archive=<path>, pre_isa_archive=<path>, file_base_path=<path>
    Parameters:
    username: username of the person the dataset will belong to
    public: boolean that determines if the dataset is public or not
    path: absolute path of the ISA-Tab file to parse
    additional_raw_data_file_extension: an optional argument that will append a
    suffix to items in Raw Data File as need be
    isa_archive: if you're passing a directory, a zipped version of the
    directory for storage and legacy purposes
    pre_isa_archive: optional copy of files that were converted to ISA-Tab
    file_base_path: if your file locations are relative paths, this is the base
    existing_data_set_uuid: UUID of an existing DataSet that a metadata
    revision is to be performed upon
    """
    file_source_translator = generate_file_source_translator(
        username=username, base_path=file_base_path, identity_id=identity_id
    )
    parser = IsaTabParser(
        file_source_translator=file_source_translator,
        additional_raw_data_file_extension=additional_raw_data_file_extension,
    )
    """Get the study title and investigation id and see if anything is in the
    database and if so compare the checksum
    """
    # 1. First check whether the user exists
    try:
        user = User.objects.get(username__exact=username)
    except (User.DoesNotExist, User.MultipleObjectsReturned):
        user = None
    # 2. If user exists we need to quickly get the dataset title to see if its
    # already in the DB
    if user:
        checksum = None
        (identifier, title) = parser.get_dataset_name(path)
        if identifier is None or title is None:
            datasets = []
        else:
            dataset_title = "%s: %s" % (identifier, title)
            datasets = DataSet.objects.filter(name=dataset_title)
        # check if the investigation already exists
        # if not 0, update dataset with new investigation
        if len(datasets) and not existing_data_set_uuid:
            # go through datasets until you find one with the correct owner
            for ds in datasets:
                own = ds.get_owner()
                if own == user:
                    if overwrite:
                        # Remove the existing data set first
                        checksum = False
                        ds.delete()
                    else:
                        # 3. Finally we need to get the checksum so that we can
                        # compare that to our given file.
                        investigation = ds.get_investigation()
                        try:
                            """isaarchive_file should be a uuid foreign key
                            upon creation of either FileStoreItem or
                            Investigation in isa_tab_parser.py"""
                            file_store_item = FileStoreItem.objects.get(
                                uuid=investigation.isarchive_file
                            )
                            logger.info("Get file: %s", file_store_item)
                        # will fail later on when the .datafile is accessed
                        except (FileStoreItem.DoesNotExist,
                                FileStoreItem.MultipleObjectsReturned) as e:
                            logger.error(
                                'Did not get FileStoreItem for uuid %s',
                                unicode(investigation.isarchive_file), e)

                        try:
                            checksum = calculate_checksum(
                                file_store_item.datafile
                            )
                        except (EnvironmentError,
                                botocore.exceptions.BotoCoreError,
                                botocore.exceptions.ClientError) as exc:
                            logger.error(
                                "Original ISA-tab archive was not found: %s",
                                exc
                            )
        # 4. Finally if we got a checksum for an existing file, we calculate
        # the checksum for the new file and compare them
        if checksum:
            new_checksum = None
            # TODO: error handling
            with open(path, 'rb') as f:
                new_checksum = calculate_checksum(f)
            if checksum == new_checksum:
                # Checksums are identical so we can skip this file.
                logger.info("The checksum of both files is the same: %s",
                            checksum)
                return \
                    investigation.investigationlink_set.all()[0].data_set.uuid

    with transaction.atomic():
        investigation = parser.run(
            path, isa_archive=isa_archive, preisa_archive=pre_isa_archive
        )
        if existing_data_set_uuid:
            try:
                data_set = DataSet.objects.get(uuid=existing_data_set_uuid)
            except (DataSet.DoesNotExist,
                    DataSet.MultipleObjectsReturned) as e:
                logger.error('DataSet for uuid %s not fetched and thus not '
                             'updated with revised investigation %s: %s',
                             existing_data_set_uuid, unicode(investigation), e)
                raise type(e)(
                    'DataSet for uuid %s not fetched and thus not '
                    'updated with revised investigation {}: {}'.format(
                         existing_data_set_uuid, unicode(investigation)
                    )
                )
            else:
                data_set.update_with_revised_investigation(investigation)
                return existing_data_set_uuid

        data_set_uuid = create_dataset(
            investigation.uuid, username, public=public
        )
        return data_set_uuid


@task(soft_time_limit=180)
def generate_auxiliary_file(parent_node_uuid):
    """Task that will generate an auxiliary file for visualization purposes
    with specific file generation tasks going on for different FileTypes
    flagged as: `used_for_visualization`.
    :param parent_node: the parent Node uuid
    :type parent_node_file_store_item: Node
    """
    generate_auxiliary_file.update_state(state=celery.states.STARTED)
    parent_node = Node.objects.get(uuid=parent_node_uuid)
    datafile = parent_node.file_item.datafile
    auxiliary_file_store_item = FileStoreItem.objects.create()
    auxiliary_node = parent_node.create_and_associate_auxiliary_node(
        auxiliary_file_store_item
    )
    try:
        if not settings.REFINERY_S3_USER_DATA:
            datafile_path = datafile.path
        else:
            datafile_path = datafile.name
    except (NotImplementedError, ValueError):
        datafile_path = None
    
    start_time = time.time()
    logger.debug("Starting auxiliary file gen. for %s" % datafile_path)

    # Here we are checking for the FileExtension of the ParentNode's
    # FileStoreItem because we will create auxiliary files based on what
    # said value is
    if parent_node.file_item.get_extension().lower() == 'bam':
        try:
            generate_bam_index(auxiliary_node.file_item.uuid, datafile_path)
        except Exception as e:
            logger.error(
              "Something went wrong while trying to generate the auxiliary file "
              "for %s. %s" % (datafile_path, e))
            generate_auxiliary_file.update_state(state=celery.states.FAILURE)

            raise celery.exceptions.Ignore()
        else:
            generate_auxiliary_file.update_state(state=celery.states.SUCCESS)

            logger.debug("Auxiliary file for %s generated in %s "
                     "seconds." % (datafile_path, time.time() - start_time))
            return auxiliary_file_store_item.uuid


def generate_bam_index(auxiliary_file_store_item_uuid, datafile_path):
    """
    Generate a bam_index file and associate it with the auxiliary
    FileStoreItem from our generate_auxiliary_file task
    :param auxiliary_file_store_item_uuid: uuid of FileStoreItem to generate
    auxiliary file for
    :type auxiliary_file_store_item_uuid: string
    :param datafile_path: Full path on disk to the datafile that we want to
    generate a bam index file for
    :type datafile_path: string
    """

    # Try and fetch the bam_index FileExtension
    # NOTE: that we are not handling the normal errors for an orm.get()s below
    # because we want the task from which this function is called within to
    # fail if we can't get what we want.
    bam_index_file_extension = FileExtension.objects.get(name="bai").name
    auxiliary_file_store_item = FileStoreItem.objects.get(
        uuid=auxiliary_file_store_item_uuid
    )

    if settings.REFINERY_S3_USER_DATA:
        key = datafile_path
        bucket = settings.MEDIA_BUCKET
        temp_file = os.path.join(tempfile.gettempdir(), key)
        os.makedirs(os.path.abspath(os.path.join(temp_file, os.pardir)))
        with open(temp_file, 'wb') as destination:
            download_s3_object(bucket, key, destination)
        pysam.index(bytes(temp_file))
        datafile_path = temp_file
        os.remove(temp_file)
    else:
        temp_file = os.path.join(tempfile.gettempdir(), datafile_path)
        os.makedirs(os.path.abspath(os.path.join(temp_file, os.pardir)))
        with open(temp_file, 'wb') as destination, \
                open(datafile_path, 'rb') as source:
            copy_file_object(source, destination)
        pysam.index(bytes(temp_file))
        datafile_path = temp_file
        os.remove(temp_file)

    # Map source field of FileStoreItem to path of newly created bam index file
    auxiliary_file_store_item.source = "{}.{}".format(
        datafile_path, bam_index_file_extension)
    auxiliary_file_store_item.save()


def post_process_file_import(**kwargs):
    """Updates Solr with state of file import and starts generating auxiliary
    file if import finished successfully
    """
    # allow for the use of uuid as a keyword or positional argument
    try:
        file_store_item_uuid = kwargs['kwargs']['item_uuid']
    except KeyError:
        file_store_item_uuid = kwargs['args'][0]
    try:
        node = Node.objects.get(file_item__uuid=file_store_item_uuid)
    except Node.DoesNotExist as exc:
        logger.error("Could not retrieve Node with file UUID '%s': %s",
                     file_store_item_uuid, exc)
    except Node.MultipleObjectsReturned:
        logger.critical("Multiple Node instance returned with file UUID '%s'",
                        file_store_item_uuid)
    else:
        node.update_solr_index()
        logger.info("Updated Solr index with file import state for Node '%s'",
                    node.uuid)
        if kwargs['state'] == celery.states.SUCCESS and \
                node.is_auxiliary_node_needed():
            node.run_generate_auxiliary_node_task()


@celery.signals.worker_init.connect
def on_worker_init(sender, **kwargs):
    # required to connect update_solr_index handler to task_postrun signal
    # https://github.com/celery/celery/issues/1873#issuecomment-35288899
    celery.signals.task_postrun.connect(
        post_process_file_import, sender=sender.app.tasks[FileImportTask.name]
    )
