'''
Created on May 11, 2012

@author: nils
'''

from collections import deque
from data_set_manager.models import Node, Attribute, Investigation, Study, \
    ProtocolReference, Protocol, ProtocolReferenceParameter
import csv
import logging

'''
from data_set_manager.isa_tab_parser import IsaTabParser
p = IsaTabParser()
p.run( "dfdf" )
p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/ae_hsci_imports/E-GEOD-16375/s_E-GEOD-16375_studysample.txt" )
p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/ae_hsci_imports/E-GEOD-16375/a_E-GEOD-16375_assay.txt" )

p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/ae_hsci_imports/E-GEOD-16013/s_E-GEOD-16013_studysample.txt" )
p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/ae_hsci_imports/E-GEOD-16013/a_E-GEOD-16013_assay.txt" )


p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/s_Expression Study in CDX2 knock-out mice.txt" )
p._parse_study_file( "/Users/nils/Data/Refinery/ISA-Tab/a_transcriptomic.txt" )
'''


class IsaTabParser:
    
    _current_investigation = None
    _current_study = None
    _current_node = None
    _previous_node = None
    _current_attribute = None
    _current_protocol_reference = None
    _current_reader = None
    
    _logger = None
    
    def __init__(self):
        self._logger = logging.getLogger(__name__)
        # create console handler with a higher log level
        self._logger.addHandler( logging.StreamHandler() )

    
    def _split_header(self, header):
        return [ x.strip() for x in header.replace( "]", "" ).strip().split( "[" ) ]        
    
    
    def _parse_node(self, headers, row ):
        '''
        row is a deque, column header is at position len( headers ) - len( row )
        ''' 

        # TODO: test if this is really a node

        header_components = self._split_header( headers[-len(row)] )
        
        # TODO: for a node the number of header components must be 1
        # assert( len( header_components ) ) == 1
        
        # try to retrieve this node from the database (unless it is a normalization or data transformation)
        is_new = True
        
        if ( header_components[0] in Node.ASSAYS | { Node.SAMPLE, Node.SOURCE, Node.EXTRACT, Node.LABELED_EXTRACT } ) or ( header_components[0] in Node.FILES and row[0].strip() is not "" ):
            node, is_new = Node.objects.get_or_create( study=self._current_study, type=header_components[0], name=row[0].strip() )
        else:
            node = Node.objects.create( study=self._current_study, type=header_components[0], name=row[0].strip() )
            
        
        if is_new:
            self._logger.info( "New node " + str( node ) + " created." )
        else:
            self._logger.info( "Node " + str( node ) + " retrieved." )
        
        self._current_node = node
        
        if self._previous_node is not None:
            try: 
                node.parents.get( to_node_id=self._previous_node.id )
            except:                
                self._previous_node.children.add( node )
                node.parents.add( self._previous_node )
                node.save()
                self._previous_node.save()        
                
        # remove the node from the row
        row.popleft()
        
        # read until we hit the next node
        while not self.is_node( headers[-len(row)] ):
            if self.is_attribute( headers[-len(row)] ):
                self._parse_attribute( headers, row )
            elif self.is_protocol_reference( headers[-len(row)] ):
                self._parse_protocol_reference( headers, row )
            else:                
                self._logger.error( "Unexpected element " + headers[-len(row)] +
                                        " when parsing node in line " + str( self._current_reader.line_num ) +
                                        ", column " + str( len(headers) - len(row) ) + "." )
                row.popleft()
                
        node.save()
        self._previous_node = node
        self._current_node = None
        return node
         
        
    def _parse_attribute(self, headers, row ):
        '''
        row is a deque, column header is at position len( headers ) - len( row )
        '''
        
        # TODO: test if this is really an attribute
         
        header_components = self._split_header( headers[-len(row)] )
        
        # TODO: for an attribute the number of header components must be 1 or 2 or 3 (for the "order" case, see ISA-Tab Spec 5.4.2)
        # assert( len( header_components ) ) > 0 and <= 3
        
        attribute = Attribute.objects.create( node = self._current_node )
        attribute.study = self._current_study
        attribute.type = header_components[0]
        attribute.value = row[0]
        
        if len( header_components ) > 1:
            attribute.subtype = header_components[1]
        
        # TODO: deal with the "order" case (see ISA-Tab Spec 5.4.2)
         
        # remove the attribute from the row
        row.popleft()
        
        if self.is_term_information( headers[-len(row)] ):
            term_information = self._parse_term_information( headers, row )
            print term_information
            attribute.value_accession = term_information["accession"]
            attribute.value_source = term_information["source"]                        
        
        if self.is_unit( headers[-len(row)] ):
            unit_information = self._parse_unit_information( headers, row )
            attribute.value_unit = unit_information["unit"]
            attribute.value_accession = unit_information["accession"]
            attribute.value_source = unit_information["source"]
                                    
        # done        
        attribute.save()        
        return attribute

    
    def _parse_protocol_reference(self, headers, row ):
        
        if self.is_protocol_reference( headers[-len(row)] ):
                    
            # TODO: turn this into a get once protocols are parsed from the investigation file
            protocol, created = Protocol.objects.get_or_create( name=row[0], study=self._current_study )            
            if protocol is None:
                self._logger.exception( "Undeclared protocol " + row[0] +
                                       " when parsing term protocol in line " + str( self._current_reader.line_num ) +
                                       ", column " + str( len(headers) - len(row) ) + "." )
                                    
            protocol_reference = ProtocolReference.objects.create( node = self._current_node, protocol=protocol )
            self._current_protocol_reference = protocol_reference
                        
            row.popleft()
            
            while self.is_protocol_reference_information( headers[-len(row)] ):
                # TDOD: handle comments
                if self.is_protocol_reference_parameter( headers[-len(row)] ):
                    self._parse_protocol_reference_parameter(headers, row)
                elif self.is_protocol_reference_performer( headers[-len(row)] ):
                    protocol_reference.performer = row[0]
                    row.popleft()  
                    # TODO: lookup performer uuid from user database
                elif self.is_protocol_reference_date( headers[-len(row)] ):
                    protocol_reference.date = row[0]
                    row.popleft()  
                    # TODO: lookup performer uuid from user database
                else:
                    pass
                
            protocol_reference.save()            
            return protocol_reference
                                    
        
    def _parse_protocol_reference_parameter(self, headers, row ):
        header_components = self._split_header( headers[-len(row)] )
        
        # TODO: for a protocol reference parameter the number of header components must be 2 or 3 (for the "order" case, see ISA-Tab Spec 5.4.2)
        # assert( len( header_components ) ) > 1 and <= 3
        
        parameter = ProtocolReferenceParameter.objects.create( protocol_reference=self._current_protocol_reference )
        parameter.name = header_components[1]
        parameter.value = row[0]
        
        # TODO: deal with the "order" case (see ISA-Tab Spec 5.4.2)
         
        # remove the attribute from the row
        row.popleft()
        
        if self.is_term_information( headers[-len(row)] ):
            term_information = self._parse_term_information( headers, row )
            print term_information
            parameter.value_accession = term_information["accession"]
            parameter.value_source = term_information["source"]                        
        
        if self.is_unit( headers[-len(row)] ):
            unit_information = self._parse_unit_information( headers, row )
            parameter.value_unit = unit_information["unit"]
            parameter.value_accession = unit_information["accession"]
            parameter.value_source = unit_information["source"]
                                    
        # done        
        parameter.save()        
        return parameter


    def _parse_term_information(self, headers, row ):
        '''
        Parses a term_accession, term_source pair. Currently does not enforce any specific order.
        ''' 
                
        # parse the first component (if strict, this should be the accession number)
        if self.is_term_accession( headers[-len(row)] ):
            accession = row[0]
            row.popleft()
            
            # parse the second component (if strict, this should be the ontology reference)
            if self.is_term_source( headers[-len(row)] ):
                source = row[0]
                row.popleft()
                
                return { "accession": accession, "source": source }
                        
            else:
                self._logger.exception( "Unexpected element " + headers[-len(row)] +
                                       " when parsing term information in line " + str( self._current_reader.line_num ) +
                                       ", column " + str( len(headers) - len(row) ) + "." )
        
        elif self.is_term_source( headers[-len(row)] ):
            source = row[0]
            row.popleft()
            
            # parse the second component (if strict, this should be the ontology reference)
            if self.is_term_accession( headers[-len(row)] ):
                accession = row[0]
                row.popleft()
                
                return { "accession": accession, "source": source }
                        
            else:
                self._logger.exception( "Unexpected element " + headers[-len(row)] +
                                       " when parsing term information in line " + str( self._current_reader.line_num ) +
                                       ", column " + str( len(headers) - len(row) ) + "." )
        else:
            self._logger.exception( "Unexpected element " + headers[-len(row)] +
                                   " when parsing term information in line " + str( self._current_reader.line_num ) +
                                   ", column " + str( len(headers) - len(row) ) + "." )
        

    def _parse_unit_information(self, headers, row ):
        '''
        Parses a term_accession, term_source pair. Currently does not enforce any specific order.
        ''' 
                
        # parse the first component (if strict, this should be the accession number)
        if self.is_unit( headers[-len(row)] ):
            unit = row[0]
            row.popleft()
        else:
            self._logger.exception( "Unexpected element " + headers[-len(row)] +
                       " when parsing unit information in line " + str( self._current_reader.line_num ) +
                       ", column " + str( len(headers) - len(row) ) + "." )
            
        # parse term information if available
        if self.is_term_information( headers[-len(row)] ):
            term_information = self._parse_term_information(headers, row)
            
        return { "unit": unit, "accession": term_information["accession"], "source": term_information["source"] }                    
                            
        
    def _parse_study_file(self, file_name):
        
        # TODO: replace this with the real study
        self._current_reader = csv.reader( open( file_name, "rb" ), dialect="excel-tab" )
                        
        # read column headers
        headers = []
        headers = self._current_reader.next()
        
        try:
            headers.remove( "" )
        except:
            pass
        
        print( ", ".join( headers ) )
        
        # TODO: create a list of header "types" from this
        
        for row in self._current_reader:            
            row = deque( row )
            print( ", ".join( row ) )
            self._previous_node = None
            
            while len( row ) > 0:                
                print ( "parsing node from row " + str( self._current_reader.line_num ) )
                self._current_node = None
                self._parse_node(headers, row)
    
    def run(self, path):
        '''
        If path is a file it will be treated as an ISArchive, if it is a directory it will be treated
        as an extracted ISArchive
        '''
        
        # TODO: parse this
        self._current_investigation = Investigation.objects.create()
        self._current_study = Study.objects.create( investigation=self._current_investigation )
    
    
    '''
    Utility Functions
    =================
    '''

    def is_node(self, string):
        return string.split( "[" )[0].strip() in Node.TYPES 
    
    def is_attribute(self, string):
        return string.split( "[" )[0].strip() in Attribute.TYPES
    
    def is_protocol_reference(self, string):
        return string.split( "[" )[0].strip() == "Protocol REF"
         
    def is_protocol_reference_parameter(self, string):
        return string.split( "[" )[0].strip() == "Parameter Value"

    def is_protocol_reference_performer(self, string):
        return string.split( "[" )[0].strip() == "Performer"

    def is_protocol_reference_date(self, string):
        return string.split( "[" )[0].strip() == "Date"

    def is_protocol_reference_information(self, string):
        return self.is_protocol_reference_date(string) or self.is_protocol_reference_performer(string) or self.is_protocol_reference_parameter(string) 

    def is_unit(self, string):
        return string.split( "[" )[0].strip() == "Unit"

    def is_term_accession(self, string):
        return string.split( "[" )[0].strip() == "Term Accession Number"

    def is_term_source(self, string):
        return string.split( "[" )[0].strip() == "Term Source REF"

    def is_term_information(self, string):
        return self.is_term_accession(string) or self.is_term_source(string)
    