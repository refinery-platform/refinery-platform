'''
Created on Jun 20, 2012

@author: nils
'''
import csv
import logging
import operator

from django.conf import settings

from annotation_server.models import Taxon, species_to_taxon_id
from file_store.models import FileStoreItem, generate_file_source_translator
from file_store.tasks import import_file

from .models import Assay, Attribute, Investigation, Node, Study
from .tasks import create_dataset

logger = logging.getLogger(__name__)


class SingleFileColumnParser:
    """Creates a source -> sample -> assay -> raw data file sequences.
    Attaches all attributes to the sample node.
    Assumptions:
    1. Each line corresponds to a data file that will be treated as a "raw data
    file".
    2. Each data file occurs only once in the file.
    3. All information relating to a given data file can be found in the same
    line of the input file.
    4. First row contains the column headers and there is one non-empty string
    for each column.
    Defaults:
    delimiter = comma
    file_column_index = last column
    file_permanent = files will be added to the file store permanently
    """
    def __init__(
        self,
        metadata_file,
        file_source_translator,
        source_column_index,
        data_file_column_index=-1,
        auxiliary_file_column_index=None,
        file_base_path="",
        data_file_permanent=False,
        species_column_index=None,
        genome_build_column_index=None,
        annotation_column_index=None,
        sample_column_index=None,
        assay_column_index=None,
        column_index_separator=" ",
        delimiter="comma",
        custom_delimiter_string=","
    ):
        """Prepare metadata file for parsing"""
        # single character to be used to separate columns
        if delimiter == "comma":
            self.delimiter = ","
        if delimiter == "tab":
            self.delimiter = "\t"
        if delimiter == "custom":
            self.delimiter = custom_delimiter_string

        # metadata file object
        self.metadata_file = metadata_file
        self.metadata_file.seek(0)
        try:
            # need to use splitlines() to avoid potential newline errors
            # http://madebyknight.com/handling-csv-uploads-in-django/
            self.metadata_reader = csv.reader(
                self.metadata_file.read().splitlines(),
                dialect="excel-tab",
                delimiter=self.delimiter)
        except csv.Error:
            logger.exception("Unable to read file %s", str(self.metadata_file))
            raise
        # compute number of columns
        self.headers = self.metadata_reader.next()
        self.num_columns = len(self.headers)
        # data file reference converter
        self.file_source_translator = file_source_translator
        # column of the input file that contains the path to the input file
        # May not be None. Negative values are allowed and are counted from the
        # last column of the file (-1 = last column)
        if data_file_column_index < 0:
            self.file_column_index = self.num_columns + data_file_column_index
        else:
            self.file_column_index = data_file_column_index
        # column of the input file that contains the path to an auxiliary file
        # (e.g. for visualization) associated with the input file
        # May be None. Negative values are allowed and are counted from the
        # last column of the file (-1 = last column)
        if auxiliary_file_column_index and auxiliary_file_column_index < 0:
            self.auxiliary_file_column_index =\
                self.num_columns + auxiliary_file_column_index
        else:
            self.auxiliary_file_column_index = auxiliary_file_column_index

        # absolute path used prefix data file names and paths encountered in
        # the input file
        self.file_base_path = file_base_path
        # flag indicating whether files should be stored permanently in the
        # file store or only temporarily
        self.file_permanent = data_file_permanent
        # column containing species names or ids, if set to None the parser
        # will not set this information
        self.species_column_index = species_column_index
        # column containing genome build ids, if set to None the parser will
        # not set this information
        self.genome_build_column_index = genome_build_column_index
        # column containing boolean flag to indicate whether the data file in
        # this row should be treated as an annotation file
        # only those rows where this flag is "True"/"true"/"TRUE"/etc. will be
        # treated a annotation files
        # all others (most notably those where the field is empty) will be
        # treated as regular files
        self.annotation_column_index = annotation_column_index
        # list of column indices to be used for source, sample and assay
        # grouping (may be None), values in these columns will be combined
        # using column_index_separator
        self.source_column_index = source_column_index
        self.sample_column_index = sample_column_index
        self.assay_column_index = assay_column_index
        self.column_index_separator = column_index_separator

    def _create_investigation(self):
        return Investigation.objects.create()

    def _create_study(self, investigation, file_name):
        return Study.objects.create(
            investigation=investigation, file_name=file_name)

    def _create_assay(self, study, file_name):
        return Assay.objects.create(study=study, file_name=file_name)

    def _get_species(self, row):
        if self.species_column_index is not None:
            try:
                species_name = row[self.species_column_index].strip()
                taxon_id_options = species_to_taxon_id(species_name)
                if len(taxon_id_options) > 1:
                    logger.warn(
                        "Using first out of multiple taxon ids found for "
                        "%s: %s", species_name, taxon_id_options)
                return taxon_id_options[0][1]
            except Taxon.DoesNotExist:
                return None
        return None

    def _get_genome_build(self, row):
        if self.genome_build_column_index is not None:
            return row[self.genome_build_column_index].strip()
        return None

    def _is_annotation(self, row):
        if self.annotation_column_index is not None:
            return bool(
                "true" == row[self.annotation_column_index].lower().strip())
        return False

    def _create_name(self, row, internal_column_index,
                     internal_file_column_index):
        if internal_column_index is None:
            return row[internal_file_column_index].strip()
        else:
            return self.column_index_separator.join(
                operator.itemgetter(*internal_column_index)(row))

    def run(self):
        # create investigation, study and assay objects
        investigation = self._create_investigation()
        # FIXME: self.metadata_file.name may not be informative, especially in
        # case of temp files that don't exist on disk
        study = self._create_study(investigation=investigation,
                                   file_name=self.metadata_file.name)
        assay = self._create_assay(study=study,
                                   file_name=self.metadata_file.name)

        # import in file as "pre-isa" file
        logger.info("trying to add pre-isa archive file %s",
                    self.metadata_file.name)
        # FIXME: this will not create a FileStoreItem if self.metadata_file
        # does not exist on disk (e.g., a file object like TemporaryFile)
        file_store_item = \
            FileStoreItem.objects.create(source=self.metadata_file.name)
        investigation.pre_isarchive_file = file_store_item.uuid
        import_file(investigation.pre_isarchive_file, refresh=True)
        investigation.save()

        # TODO: test if there are fewer columns than required
        logger.debug("Parsing with file column %s and "
                     "auxiliary file column %s",
                     self.file_column_index, self.auxiliary_file_column_index)
        # UUIDs of data files to postpone importing until parsing is finished
        data_files = []
        # iterate over non-header rows in file
        for row in self.metadata_reader:
            # TODO: resolve relative indices
            internal_source_column_index = self.source_column_index
            internal_sample_column_index = self.sample_column_index
            internal_assay_column_index = self.assay_column_index
            # add data file to file store
            data_file_path = self.file_source_translator(
                row[self.file_column_index])
            data_file_item = \
                FileStoreItem.objects.create(source=data_file_path)
            data_files.append(data_file_item.uuid)
            # add auxiliary file to file store
            if self.auxiliary_file_column_index:
                auxiliary_file_path = self.file_source_translator(
                    row[self.auxiliary_file_column_index])
                auxiliary_file_item = \
                    FileStoreItem.objects.create(source=auxiliary_file_path)
                data_files.append(auxiliary_file_item.uuid)
            # create nodes if file was successfully created
            # source node
            source_name = self._create_name(
                row, internal_source_column_index, self.file_column_index)
            source_node, is_source_new = Node.objects.get_or_create(
                study=study, name=source_name, type=Node.SOURCE)
            # sample node
            sample_name = self._create_name(
                row, internal_sample_column_index, self.file_column_index)
            sample_node, is_sample_new = Node.objects.get_or_create(
                study=study, name=sample_name, type=Node.SAMPLE)
            source_node.add_child(sample_node)
            # assay node
            assay_name = self._create_name(
                row, internal_assay_column_index, self.file_column_index)
            assay_node, is_assay_new = Node.objects.get_or_create(
                study=study, assay=assay, name=assay_name, type=Node.ASSAY)
            sample_node.add_child(assay_node)
            file_node = Node.objects.create(
                study=study, assay=assay,
                name=row[self.file_column_index].strip(),
                file_uuid=data_file_item.uuid, type=Node.RAW_DATA_FILE,
                species=self._get_species(row),
                genome_build=self._get_genome_build(row),
                is_annotation=self._is_annotation(row))
            assay_node.add_child(file_node)
            # iterate over columns to create attributes to attach to sample
            # node
            for column_index in range(0, len(row)):
                # skip data file column
                if (self.file_column_index == column_index or
                        self.auxiliary_file_column_index == column_index or
                        self.annotation_column_index == column_index):
                    continue
                # create attribute as characteristic and attach to sample node
                # if the sample node was newly created
                if is_sample_new:
                    Attribute.objects.create(
                        node=sample_node, type=Attribute.CHARACTERISTICS,
                        subtype=self.headers[column_index].strip().lower(),
                        value=row[column_index].strip()
                    )

        # Start remote file import tasks if `Make Import Permanent:` flag set
        # by the user
        # Likewise, we'll try to import these files if their source begins with
        # our REFINERY_DATA_IMPORT_DIR setting (This will be the case if
        # users upload datafiles associated with their metadata)

        for uuid in data_files:
            try:
                file_store_item = FileStoreItem.objects.get(uuid=uuid)
            except (FileStoreItem.DoesNotExist,
                    FileStoreItem.MultipleObjectsReturned) as e:
                logger.error("Couldn't properly fetch FileStoreItem %s", e)
            else:

                if (self.file_permanent or file_store_item.source.startswith(
                        (settings.REFINERY_DATA_IMPORT_DIR, 's3://')
                )):
                    import_file.delay(uuid)

        return investigation


def process_metadata_table(
    username,
    title,
    metadata_file,
    source_columns,
    data_file_column,
    auxiliary_file_column=None,
    base_path="",
    data_file_permanent=False,
    species_column=None,
    genome_build_column=None,
    annotation_column=None,
    sample_column=None,
    assay_column=None,
    is_public=False,
    delimiter="comma",
    custom_delimiter_string=",",
    identity_id=None
):
    """Create a dataset given a metadata file object and its description
    :param username: username
    :type username: str
    :param title: dataset name
    :type title: str
    :param metadata_file: metadata file in tab-delimited format
    :type metadata_file: file
    :param source_columns: a list of source column indices
    :type source_columns: list of ints
    :param data_file_column: data file column index
    :type data_file_column: int
    :param data_file_permanent: should data files be imported
    :type data_file_permanent: bool
    :param base_path: path to append to data file
    :type base_path: str
    :param auxiliary_file_column: auxiliary file column index
    :type auxiliary_file_column: int
    :param species_column: species column index
    :type species_column: int
    :param genome_build_column: genome build column index
    :type genome_build_column: int
    :param annotation_column: annotation column index
    :type annotation_column: int
    :param is_public: is dataset available to public
    :type is_public: bool
    :returns: UUID of the new dataset
    """
    try:
        source_columns = [abs(int(x)) for x in source_columns]
    except ValueError as exc:
        logger.error(exc)
        raise ValueError("source column indices must be integers")
    try:
        data_file_column = int(data_file_column)
    except ValueError as exc:
        logger.error(exc)
        raise ValueError("data file column index must be an integer")
    try:
        auxiliary_file_column = int(auxiliary_file_column)
    except (TypeError, ValueError):
        auxiliary_file_column = None
    try:
        base_path = str(base_path)
    except ValueError:
        base_path = ""
    try:
        species_column = int(species_column)
    except (TypeError, ValueError):
        species_column = None
    try:
        genome_build_column = int(genome_build_column)
    except (TypeError, ValueError):
        genome_build_column = None
    try:
        annotation_column = int(annotation_column)
    except (TypeError, ValueError):
        annotation_column = None
    try:
        sample_column = int(sample_column)
    except (TypeError, ValueError):
        sample_column = None
    try:
        assay_column = int(assay_column)
    except (TypeError, ValueError):
        assay_column = None
    try:
        delimiter = str(delimiter)
    except ValueError:
        delimiter = "comma"

    try:
        custom_delimiter_string = str(custom_delimiter_string)
    except ValueError:
        custom_delimiter_string = ","

    data_file_permanent = bool(data_file_permanent)
    is_public = bool(is_public)
    file_source_translator = generate_file_source_translator(
        username=username, base_path=base_path, identity_id=identity_id)

    parser = SingleFileColumnParser(
        metadata_file=metadata_file,
        file_source_translator=file_source_translator,
        source_column_index=source_columns,
        data_file_column_index=data_file_column,
        auxiliary_file_column_index=auxiliary_file_column,
        file_base_path=base_path,
        data_file_permanent=data_file_permanent,
        species_column_index=species_column,
        genome_build_column_index=genome_build_column,
        annotation_column_index=annotation_column,
        sample_column_index=sample_column,
        assay_column_index=assay_column,
        column_index_separator="/",
        delimiter=delimiter,
        custom_delimiter_string=custom_delimiter_string
    )

    investigation = parser.run()
    investigation.title = title
    investigation.save()

    return create_dataset(
        investigation_uuid=investigation.uuid, username=username,
        dataset_name=title, public=is_public)
