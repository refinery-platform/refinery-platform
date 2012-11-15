'''
Created on Jun 20, 2012

@author: nils
'''
from data_set_manager.models import Investigation, Study, Node, Attribute, Assay
from data_set_manager.genomes import map_species_name_to_id
from file_store.tasks import create
import csv
import operator
import os
import logging

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
            return map_species_name_to_id( row[self.species_column_index].strip() )        
        return None        

    def _get_genome_build( self, row ):
        if self.genome_build_column_index is not None:
            return map_species_name_to_id( row[self.genome_build_column_index].strip() )        
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

    def _parse_file(self, file_name ):
        try:
            self._current_file =  open( file_name, "rU" )
            self._current_reader = csv.reader( self._current_file, dialect="excel-tab", delimiter=self.delimiter )
        except:
            logger.exception( "Unable to read file " + str( self._current_file ) + "." )
        
        # create investigation, study and assay objects
        investigation = self._create_investigation()
        study = self._create_study( investigation=investigation, file_name=file_name )                
        assay = self._create_assay( study=study, file_name=file_name )                
            
        # read column headers
        headers = []
        headers = self._current_reader.next()
        
        # iterate over non-header rows in file
        for row in self._current_reader:
            
            # compute absolute file_column_index (in case a negative value was provided)
            if self.file_column_index >= 0:
                internal_file_column_index = self.file_column_index
            else:                
                internal_file_column_index = len( row ) + self.file_column_index
                
            # TODO: resolve relative indices
            internal_source_column_index = self.source_column_index            
            internal_sample_column_index = self.sample_column_index            
            internal_assay_column_index = self.assay_column_index            
                
            # create the nodes for the data file in this row
            if self.file_base_path is None:
                file_path = row[internal_file_column_index].strip()
            else:
                file_path = os.path.join( self.file_base_path, row[internal_file_column_index].strip() )
                
            file_uuid = create( source=file_path, permanent=self.file_permanent )
                                    
            if file_uuid is not None:
                logger.info( "Added " + file_path + " to file store." )
            else:
                logger.exception( "Unable to add " + file_path + " to file store." )

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
                if ( internal_file_column_index == column_index ) or ( self.annotation_column_index == column_index ):
                    continue
                
                # create attribute as characteristic and attach to sample node if the sample node was newly created
                if is_sample_new:
                    attribute = Attribute.objects.create(
                        node=sample_node,
                        type=Attribute.CHARACTERISTICS,
                        subtype=headers[column_index].strip().lower(),
                        value=row[column_index].strip() )             
             
        return investigation
                    
        

    def run(self, file_name, archive=None):
        
        if self.file_column_index is None:
            logger.exception( "The index of the column containing the data file paths cannot be None." )
            
        return self._parse_file( file_name )        

    

