from datetime import datetime, timedelta
import logging
import requests
import socket
import urlparse

from django.conf import settings
from django.db.models.deletion import Collector
from django.db.models.fields.related import ForeignKey

from amqplib.client_0_8.exceptions import (
    AMQPChannelException, AMQPConnectionException
)
from celery.exceptions import TimeLimitExceeded, TaskRevokedError
from celery.task import task, periodic_task
from celery.task.control import ping

from core.models import (
    DataSet, InvestigationLink, ExternalToolStatus, WorkflowEngine
)
from data_set_manager.models import Investigation, Study
from data_set_manager.tasks import annotate_nodes
from file_store.models import is_permanent
from file_store.tasks import create, read, import_file


logger = logging.getLogger(__name__)


def copy_file(orig_uuid):
    """Helper function that copies a file if given the original file's UUID
    :param orig_uuid: UUID of file to copy.
    :type orig_uuid: str.
    :returns: UUID of newly copied file.
    """
    orig_fsi = read(orig_uuid)
    newfile_uuid = None
    try:
        newfile_uuid = create(
            orig_fsi.source, orig_fsi.sharename, orig_fsi.filetype,
            permanent=is_permanent(orig_uuid)
        )
        import_file(newfile_uuid, refresh=True)
    except AttributeError:
        pass

    return newfile_uuid


def copy_object(obj, value=None, field=None, duplicate_order=None,
                copy_files=False):
    """Duplicate all related objects of obj setting field to value
    If one of the duplicate objects has an FK to another duplicate object
    update that as well. Return the duplicate copy of obj.
    This code was adapted from http://djangosnippets.org/snippets/1282/
    :param obj: Object to copy.
    :type obj: Model instance of something.
    :param value: value to set.
    :type value: str.
    :param field: field to update.
    :type field: str.
    :param duplicate_order: list of models which specify how the duplicate
    objects are saved. For complex objects this can matter. Check to save if
    objects are being saved correctly and if not just pass in related objects
    in the order that they should be saved.
    :type duplicate_order: list.
    :param copy_files: Flag indicating whether to create a copy of the
    FileStoreItem or simply copy the original FileStoreItem's UUID.
    :type copy_files: bool.
    :returns: copy of Model instance if successful.
    """
    # key = original object, value = copy of original object
    associated_copy = dict()
    collector = Collector("default")
    collector.collect([obj])
    collector.sort()
    related_models = collector.data.keys()
    data_snapshot = {}
    for key in collector.data.keys():
        data_snapshot.update({
            key: dict(zip(
                [item.pk for item in collector.data[key]],
                [item for item in collector.data[key]]
            ))
        })

    root_obj = None

    # Sometimes it's good enough just to save in reverse deletion order
    if duplicate_order is None:
        duplicate_order = reversed(related_models)

    for model in duplicate_order:
        # Find all FKs on model that point to a related_model
        fks = []
        for f in model._meta.fields:
            if isinstance(f, ForeignKey) and f.rel.to in related_models:
                fks.append(f)
        # Replace each `sub_obj` with a duplicate.
        if model not in collector.data:
            continue
        sub_objects = collector.data[model]
        for obj in sub_objects:
            orig_obj_id = obj.id

            for fk in fks:
                fk_value = getattr(obj, "%s_id" % fk.name)
                # If this FK has been duplicated then point to the duplicate.
                fk_rel_to = data_snapshot[fk.rel.to]
                if fk_value in fk_rel_to:
                    dupe_obj = fk_rel_to[fk_value]
                    setattr(obj, fk.name, dupe_obj)

            # Duplicate the object and save it.
            obj.id = None

            if copy_files:
                # copy data files referenced in file_uuid field in a Node
                try:
                    if obj.file_uuid:
                        obj.file_uuid = copy_file(obj.file_uuid)
                except AttributeError:
                    pass

                # copy metadata files associated with an Investigation
                try:
                    if obj.isarchive_file or obj.pre_isarchive_file:
                        try:
                            obj.isarchive_file = copy_file(obj.isarchive_file)
                        except:
                            pass
                        try:
                            obj.pre_isarchive_file = copy_file(
                                obj.pre_isarchive_file)
                        except:
                            pass
                except AttributeError:
                    pass

            try:
                if obj.uuid:
                    obj.uuid = None
            except AttributeError:
                pass

            if field is not None:
                setattr(obj, field, value)

            obj.save()

            # plug the original object and its copy into the dictionary
            associated_copy[model.objects.get(id=orig_obj_id)] = obj

            if root_obj is None:
                root_obj = obj

    # work out Many-To-Manys
    for model in duplicate_order:
        sub_objects = collector.data[model]
        for obj in sub_objects:
            m2m_dict = dict()
            for m2m in model._meta.many_to_many:
                m2m_manager = getattr(obj, "%s_set" % m2m.name)
                m2m_dict[m2m.name] = m2m_manager.all()
            try:
                copied_obj = associated_copy[obj]
                for m2m in model._meta.many_to_many:
                    m2m_field_manager = getattr(copied_obj, m2m.name)
                    for item in m2m_dict[m2m.name]:
                        m2m_field_manager.add(associated_copy[item])
            except KeyError:
                pass

    return root_obj


@task()
def copy_dataset(dataset, owner, versions=None, copy_files=False):
    logger.info("logging from copy_dataset")
    if versions is None:
        versions = [dataset.get_version()]
    # count total number of objects to copy
    items_to_copy = 1
    collector = Collector("default")
    for version in versions:
        collector.collect([dataset.get_investigation(version)])
        for key in collector.data.keys():
            items_to_copy += len(collector.data[key])
    # check to see if dataset already exists for provided user
    dataset_copy = None
    data_sets = DataSet.objects.filter(name="%s (copy)" % dataset.name)
    for data_set in data_sets:
        print data_set
        if data_set.get_owner() == owner:
            dataset_copy = data_set
    # if after checking all datasets there one with this name owned by the
    # given user, create new dataset
    if dataset_copy is None:
        # create new dataset with copied information
        dataset_copy = DataSet.objects.create(
            name="%s (copy)" % dataset.name, summary=dataset.summary,
            description=dataset.description, slug=dataset.slug
        )
        # set the owner to the provided user
        dataset_copy.set_owner(owner)
        dataset_copy.save()
        logger.info("copy_dataset: Created data set %s", dataset_copy.name)

    # make copies of investigations and their links and assign to newly
    # created dataset
    for version in versions:
        inv = dataset.get_investigation(version)
        node_collection = copy_object(inv, copy_files=copy_files)
        node_collection.save()

        # find the corresponding Investigation object
        try:
            inv = Investigation.objects.get(uuid=node_collection.uuid)
        except Investigation.DoesNotExist:
            inv = Study.objects.get(uuid=node_collection.uuid).investigation

        # use the Investigation object to grab its InvestigationLink object
        il = InvestigationLink.objects.get(investigation=inv)
        il.data_set = dataset_copy
        il.save()
        # annotate the investigation
        annotate_nodes(inv.uuid)

    # calculate total number of files and total number of bytes
    dataset_copy.file_size = dataset.get_file_size()
    dataset_copy.file_count = dataset.get_file_count()
    dataset_copy.save()

    return dataset_copy


@periodic_task(
    run_every=timedelta(seconds=ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.CELERY_TOOL_NAME]),
    expires=int(ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.CELERY_TOOL_NAME])-1,
    time_limit=ExternalToolStatus.TIMEOUT[ExternalToolStatus.CELERY_TOOL_NAME]
)
def check_for_celery():
    celery, created = ExternalToolStatus.objects.get_or_create(
        name=ExternalToolStatus.CELERY_TOOL_NAME)
    if celery.is_active:
        try:
            array = ping()  # pings celery to see if it's alive
            if len(array) == 0:
                # celery is gone, get error thrown
                celery.status = ExternalToolStatus.FAILURE_STATUS
            else:
                # celery is alive
                celery.status = ExternalToolStatus.SUCCESS_STATUS
        except IOError:
            logger.info(
                "core.tasks.check_for_celery: "
                "Celeryd could not connect to the broker (e.g. RabbitMQ). "
                "Please restart it."
            )
            # quit with error
            celery.status = ExternalToolStatus.FAILURE_STATUS
        except AMQPConnectionException:
            logger.info(
                "core.tasks.check_for_celery: "
                "Celeryd could not connect to the broker (e.g. RabbitMQ). "
                "Please restart it."
            )
            # quit with error
            celery.status = ExternalToolStatus.FAILURE_STATUS
        except AMQPChannelException:
            logger.error(
                "AMQPChannelException raised by ping(). "
                "Is your broker (e.g. RabbitMQ) available?"
            )
            celery.status = ExternalToolStatus.SUCCESS_STATUS
        except socket.error:
            logger.info(
                "core.tasks.check_for_celery: "
                "Celeryd could not connect to the broker (e.g. RabbitMQ). "
                "Please restart it."
            )
            # quit with error
            celery.status = ExternalToolStatus.FAILURE_STATUS
        except:
            logger.info(
                "core.tasks.check_for_celery: "
                "Something went wrong, check the stack trace below for what"
            )
            celery.status = ExternalToolStatus.FAILURE_STATUS
        # set last time check to now
        celery.last_time_check = datetime.now()
        # save status
        celery.save()


@periodic_task(
    run_every=timedelta(seconds=ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.SOLR_TOOL_NAME]),
    expires=int(ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.SOLR_TOOL_NAME])-1,
    time_limit=ExternalToolStatus.TIMEOUT[ExternalToolStatus.SOLR_TOOL_NAME]
)
def check_for_solr():
    solr, created = ExternalToolStatus.objects.get_or_create(
        name=ExternalToolStatus.SOLR_TOOL_NAME)
    if solr.is_active:
        try:  # actually check now
            requests.get(settings.REFINERY_SOLR_BASE_URL + "core/admin/ping")
            # successfully reached solr
            solr.status = ExternalToolStatus.SUCCESS_STATUS
        except requests.ConnectionError:
            logger.error(
                "core.tasks.check_for_solr: Could not connect to Solr"
            )
            # quit with error
            solr.status = ExternalToolStatus.FAILURE_STATUS
        except:
            logger.exception(
                "core.tasks.check_for_solr: "
                "Something went wrong, check the stack trace below for what"
            )
            solr.status = ExternalToolStatus.FAILURE_STATUS
        # set last time check to now
        solr.last_time_check = datetime.now()
        # save status
        solr.save()


@periodic_task(
    run_every=timedelta(seconds=ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.GALAXY_TOOL_NAME]),
    expires=int(ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
        ExternalToolStatus.GALAXY_TOOL_NAME])-1,
    time_limit=ExternalToolStatus.TIMEOUT[ExternalToolStatus.GALAXY_TOOL_NAME]
)
def dispatch_galaxy_checks():
    workflow_engines = WorkflowEngine.objects.all()
    for workflow_engine in workflow_engines:
        instance = workflow_engine.instance
        galaxy, created = ExternalToolStatus.objects.get_or_create(
            name=ExternalToolStatus.GALAXY_TOOL_NAME,
            unique_instance_identifier=instance.api_key
        )
        if galaxy.is_active:
            try:
                # pass the workflow instance and the galaxy model instance
                check_for_galaxy.delay(instance, galaxy)
            except TimeLimitExceeded:
                logger.error(
                    "core.tasks.check_for_galaxy: "
                    "Pinging Galaxy timed out after %s",
                    ExternalToolStatus.TIMEOUT[
                        ExternalToolStatus.GALAXY_TOOL_NAME]
                )
            except TaskRevokedError:
                logger.info(
                    "core.tasks.check_for_galaxy: "
                    "task was revoked because it took too long to get "
                    "dispatched"
                )


@task(
    expires=int(ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[
                    ExternalToolStatus.GALAXY_TOOL_NAME])-1,
    time_limit=ExternalToolStatus.TIMEOUT[ExternalToolStatus.GALAXY_TOOL_NAME]
)
def check_for_galaxy(instance, galaxy):
    try:
        # send a GET request for Galaxy's robots.txt file
        url = urlparse.urljoin(instance.base_url, "robots.txt")
        r = requests.get(url)
        r.raise_for_status()
        # galaxy running properly
        galaxy.status = ExternalToolStatus.SUCCESS_STATUS
    except requests.exceptions.HTTPError as exc:
        # galaxy is up and returned a 4xx or 5xx status
        logger.warn(exc)
        galaxy.status = ExternalToolStatus.SUCCESS_STATUS
    except requests.exceptions.ConnectionError:
        logger.error(
            "core.tasks.check_for_galaxy: Could not connect to Galaxy")
        # quit with error
        galaxy.status = ExternalToolStatus.FAILURE_STATUS
    except:
        logger.exception(
            "core.tasks.check_for_galaxy: "
            "Something went wrong, check the stack trace below for what"
        )
        galaxy.status = ExternalToolStatus.FAILURE_STATUS
    # set last time check to now
    galaxy.last_time_check = datetime.now()
    # save status
    galaxy.save()


def check_tool_status(tool_name, tool_unique_instance_identifier=None):
    try:
        if tool_unique_instance_identifier is not None:
            tool = ExternalToolStatus.objects.get(
                name=tool_name,
                unique_instance_identifier=tool_unique_instance_identifier
            )
        else:
            tool = ExternalToolStatus.objects.get(name=tool_name)
    except ExternalToolStatus.DoesNotExist:
        logger.error(
            "External Tool Status does not exist for %s and %s",
            tool_name, str(tool_unique_instance_identifier)
        )
        return True, ExternalToolStatus.UNKNOWN_STATUS

    if tool.is_active:
        if (datetime.now() - tool.last_time_check) > timedelta(
                seconds=ExternalToolStatus.INTERVAL_BETWEEN_CHECKS[tool_name]):
            logger.error("%s's database entry hasn't been updated since %s; "
                         "check to see if it's running",
                         tool_name, tool.last_time_check)
            return tool.is_active, ExternalToolStatus.TIMEOUT_STATUS

    return tool.is_active, tool.status
