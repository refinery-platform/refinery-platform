'''
Created on Jun 20, 2012

@author: nils
'''
import csv
import file_server
import logging
import operator
import os
import tempfile
from annotation_server.models import species_to_taxon_id, Taxon
from data_set_manager.models import Investigation, Study, Node, Attribute, Assay
from data_set_manager.tasks import create_dataset
from file_store.models import translate_file_source
from file_store.tasks import create, import_file


# get module logger
logger = logging.getLogger(__name__)


'''
from data_set_manager.single_file_column_parser import SingleFileColumnParser
p = SingleFileColumnParser()
p.file_permanent = False
p.run( "/Users/nils/Data/Refinery/modENCODe/modENCODE_refinery_example.txt" )
'''


class SingleFileColumnParser:
    '''
    Creates a source -> sample -> assay -> raw data file sequences. Attaches all attributes to the sample node. 
    
    Assumptions:
    1. Each line corresponds to a data file that will be treated as a "raw data file".
    2. Each data file occurs only once in the file.
    3. All information relating to a given data file can be found in the same line of the input file.
    4. First row contains the column headers and there is one non-empty string for each column.
    
    Defaults:
    delimiter = tab
    file_column_index = last column
    file_permanent = files will be added to the file store permanently
    '''
    
    # single character to be used to separate columns 
    delimiter = "\t"
    
    # absolute path used prefix data file names and paths encountered in the input file 
    file_base_path = None
    
    # flag indicating whether files should be stored permanently in the file store or only temporarily 
    file_permanent = True

    # column of the input file that contains the path to the input file
    # May not be None. Negative values are allowed and are counted from the last column of the file (-1 = last column)
    file_column_index = -1
    
    # column of the input file that contains the path to an auxiliary file (e.g. for visualization) associated with the input file
    # May be None. Negative values are allowed and are counted from the last column of the file (-1 = last column)
    auxiliary_file_column_index = None
    
    # column containing species names or ids, if set to None the parser will not set this information
    species_column_index = None

    # column containing genome build ids, if set to None the parser will not set this information
    genome_build_column_index = None
    
    # column containing boolean flag to indicate whether the data file in this row should be treated as an annotation file
    # only those rows where this flag is "True"/"true"/"TRUE"/etc. will be treated a annotation files
    # all others (most notably those where the field is empty) will be treated as regular files  
    annotation_column_index = None     
    
    # list of column indices to be used for source, sample and assay grouping (may be None)
    # values in these columns will be combined using the value in column_index_separator  
    source_column_index = None
    sample_column_index = None
    assay_column_index = None
    column_index_separator = " "
    
    # non-public variables
    _logger = None
    _current_file = None
    _current_reader = None    

    def __init__(self):
        logger = logging.getLogger(__name__)
        # create console handler with a higher log level
        logger.addHandler( logging.StreamHandler() )
        
    def _create_investigation(self):
        return Investigation.objects.create()
        
    def _create_study(self, investigation, file_name ):
        return Study.objects.create( investigation=investigation, file_name=file_name )   

    def _create_assay(self, study, file_name ):
        return Assay.objects.create( study=study, file_name=file_name )
    
    def _get_species( self, row ):
        if self.species_column_index is not None:            
            try:                
                species_name = row[self.species_column_index].strip()
                taxon_id_options = species_to_taxon_id( species_name )
                
                if len( taxon_id_options ) > 1:
                    logger.warn( "Using first out of multiple taxon ids found for %s: %s" % ( species_name, taxon_id_options ) )
                
                return taxon_id_options[0][1];  
            except Taxon.DoesNotExist:
                return None;
                            
        return None        

    def _get_genome_build( self, row ):
        if self.genome_build_column_index is not None:
            return row[self.genome_build_column_index].strip()        
        return None        

    def _is_annotation( self, row ):
        if self.annotation_column_index is not None:
            return bool( "true" == row[self.annotation_column_index].lower().strip() )        
        return False        

    
    def _create_name(self, row, internal_column_index, internal_file_column_index ):        
        if internal_column_index is None:
            return row[internal_file_column_index].strip()
        else:
            return self.column_index_separator.join( operator.itemgetter(*internal_column_index)(row) )            

    def _parse_file(self):
        try:
            # need to use splitlines() to avoid potential newline errors
            # http://madebyknight.com/handling-csv-uploads-in-django/
            self._current_reader = csv.reader(
                self._current_file.read().splitlines(),
                dialect="excel-tab",
                delimiter=self.delimiter)
        except:
            logger.exception("Unable to read file %s", str(self._current_file))

        # create investigation, study and assay objects
        investigation = self._create_investigation()
        study = self._create_study(investigation=investigation,
                                   file_name=self._current_file.name)
        assay = self._create_assay(study=study,
                                   file_name=self._current_file.name)

        #import in file as "pre-isa" file
        logger.info("trying to add pre-isa archive file %s",
                    self._current_file.name)
        investigation.pre_isarchive_file = create(self._current_file.name,
                                                  permanent=True)
        import_file(investigation.pre_isarchive_file, refresh=True,
                    permanent=True)
        investigation.save()
            
        # read column headers
        headers = self._current_reader.next()
        
        # compute absolute file_column_index (in case a negative value was provided)
        if self.file_column_index >= 0:
            internal_file_column_index = self.file_column_index
        else:                
            internal_file_column_index = len( headers ) + self.file_column_index

        # compute absolute auxiliary_file_column_index (in case a negative value was provided)
        if self.auxiliary_file_column_index is not None:
            if self.auxiliary_file_column_index >= 0:
                internal_auxiliary_file_column_index = self.auxiliary_file_column_index
            else:                
                internal_auxiliary_file_column_index = len( headers ) + self.auxiliary_file_column_index
        else:
            internal_auxiliary_file_column_index = None

        # TODO: test if there are fewer columns than required
        logger.debug( "Parsing with file column %s and auxiliary file column %s." % ( internal_file_column_index, internal_auxiliary_file_column_index ) )
        
        # iterate over non-header rows in file
        for row in self._current_reader:
            # TODO: resolve relative indices
            internal_source_column_index = self.source_column_index
            internal_sample_column_index = self.sample_column_index
            internal_assay_column_index = self.assay_column_index

            # add data file to file store
            if self.file_base_path is None:
                file_path = row[internal_file_column_index].strip()
            else:
                file_path = os.path.join(
                    self.file_base_path, row[internal_file_column_index].strip()
                )

            file_uuid = create(source=file_path, permanent=self.file_permanent)

            if file_uuid is not None:
                logger.debug( "Added data file " + file_path + " to file store." )
            else:
                logger.exception( "Unable to add data file " + file_path + " to file store." )

            # add auxiliary file to file store
            auxiliary_file_uuid = None

            if internal_auxiliary_file_column_index is not None:
                if self.file_base_path is None:
                    auxiliary_file_path = row[internal_auxiliary_file_column_index].strip()
                else:
                    auxiliary_file_path = os.path.join( self.file_base_path, row[internal_auxiliary_file_column_index].strip() )
                    
                auxiliary_file_uuid = create( source=auxiliary_file_path, permanent=self.file_permanent )
    
                if auxiliary_file_uuid is not None:
                    logger.debug( "Added auxiliary file " + auxiliary_file_path + "  to file store." )
                else:
                    logger.exception( "Unable to add auxiliary file " + file_path + " to file store." )
                    
                
            # add files to file server
            file_server.models.add( file_uuid, auxiliary_file_uuid );

            # create nodes if file was successfully created
            
            # source node
            source_name = self._create_name(row, internal_source_column_index, internal_file_column_index)                                
            source_node, is_source_new = Node.objects.get_or_create(
                study=study,
                name=source_name,
                type=Node.SOURCE )

            # sample node
            sample_name = self._create_name(row, internal_sample_column_index, internal_file_column_index)                                
            sample_node, is_sample_new = Node.objects.get_or_create(
                study=study,
                name=sample_name,
                type=Node.SAMPLE )            
            source_node.add_child( sample_node )

            # assay node
            assay_name = self._create_name(row, internal_assay_column_index, internal_file_column_index)                                
            assay_node, is_assay_new = Node.objects.get_or_create(
                study=study,
                assay=assay,
                name=assay_name,
                type=Node.ASSAY )            
            sample_node.add_child( assay_node )
            
            file_node = Node.objects.create(
                study=study,
                assay=assay,
                name=row[internal_file_column_index].strip(),
                file_uuid=file_uuid,
                type=Node.RAW_DATA_FILE,
                species=self._get_species( row ),
                genome_build=self._get_genome_build( row ),
                is_annotation=self._is_annotation( row ) )
            assay_node.add_child( file_node )
            
            # iterate over columns to create attributes to attach to the sample node
            for column_index in range( 0, len( row ) ):
                # skip data file column
                if ( internal_file_column_index == column_index ) or ( internal_auxiliary_file_column_index == column_index ) or ( self.annotation_column_index == column_index ):
                    continue
                
                # create attribute as characteristic and attach to sample node if the sample node was newly created
                if is_sample_new:
                    attribute = Attribute.objects.create(
                        node=sample_node,
                        type=Attribute.CHARACTERISTICS,
                        subtype=headers[column_index].strip().lower(),
                        value=row[column_index].strip() )             
             
        return investigation

    def run(self, file_object, archive=None):
        if self.file_column_index is None:
            logger.exception(
                "The index of the column containing the data file paths cannot be None")
        self._current_file = file_object
        return self._parse_file()


def process_metadata_table(username, title, metadata_file, source_columns,
                           data_file_column, data_file_permanent=False,
                           base_path="", auxiliary_file_column=None,
                           species_column=None, genome_build_column=None,
                           annotation_column=None, slug=None, is_public=False):
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
    :param slug: dataset name shortcut
    :type slug: str
    :param is_public: is dataset available to public
    :type is_public: bool

    :returns: UUID of the new dataset

    """
    parser = SingleFileColumnParser()
    parser.file_permanent = data_file_permanent
    parser.file_column_index = data_file_column
    parser.source_column_index = source_columns
    parser.column_index_separator = "/"
    parser.file_base_path = base_path
    parser.auxiliary_file_column_index = auxiliary_file_column
    parser.species_column_index = species_column
    parser.genome_build_column_index = genome_build_column
    parser.annotation_column_index = annotation_column

    # process metadata file
    reader = csv.reader(metadata_file.read().splitlines(), dialect="excel-tab",
                        delimiter=parser.delimiter)
    with tempfile.TemporaryFile() as processed_metadata_file:
        writer = csv.writer(processed_metadata_file, dialect="excel-tab",
                            delimiter=parser.delimiter)
        # get the header row
        writer.writerow(reader.next())
        # translate data file references
        for row in reader:
            translated_source = translate_file_source(
                row[data_file_column], username=username, base_path=base_path)
            row[data_file_column] = translated_source
            writer.writerow(row)
        processed_metadata_file.flush()
        processed_metadata_file.seek(0)
        investigation = parser.run(processed_metadata_file)
    investigation.title = title
    investigation.save()

    return create_dataset(investigation_uuid=investigation.uuid,
                          username=username, dataset_title=title, slug=slug,
                          public=is_public)
