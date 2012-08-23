'''
Created on May 10, 2012

@author: nils
'''

'''
General:
- xyz_term = accession number of an ontology term
- xyz_source = reference to the ontology where xyz_term originates (defined in the investigation)
'''


from django.db import models
from django_extensions.db.fields import UUIDField


class NodeCollection(models.Model):
    '''
    Base class for Investigation and Study
    '''
    uuid = UUIDField(unique=True, auto=True)
    identifier = models.TextField(blank=True, null=True)
    title = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    submission_date = models.DateField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    
    def __init__(self, *args, **kwargs ):
        # change dates from empty string to None (to pass validation)
        if "submission_date" in kwargs:
            if kwargs["submission_date"] == "":
                kwargs["submission_date"] = None    
        if "release_date" in kwargs:
            if kwargs["release_date"] == "":
                kwargs["release_date"] = None
                    
        super(NodeCollection, self).__init__( *args, **kwargs )

    def __unicode__(self):
        return unicode(self.identifier) + ( ": " + unicode(self.title) if unicode(self.title) != "" else "" ) + ": " + unicode(self.id)


class Publication(models.Model):
    '''
    Investigation or Study Publication (ISA-Tab Spec 4.1.2.2, 4.1.3.3)
    '''
    collection = models.ForeignKey(NodeCollection)
    title = models.TextField(blank=True, null=True)
    authors = models.TextField(blank=True, null=True)
    pubmed_id = models.TextField(blank=True, null=True)
    doi = models.TextField(blank=True, null=True)
    status = models.TextField(blank=True, null=True)
    # TODO: do we really want to store ontology information for this?
    status_accession = models.TextField(blank=True, null=True)
    status_source = models.TextField(blank=True, null=True)

    def __unicode__(self):
        return unicode(self.authors) + ": " + unicode(self.title)
    
    
class Contact(models.Model):
    '''
    Investigation or Study Contact (ISA-Tab Spec 4.1.2.3, 4.1.3.7)
    '''
    collection = models.ForeignKey(NodeCollection)
    last_name = models.TextField(blank=True, null=True)
    first_name = models.TextField(blank=True, null=True)
    middle_initials = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.TextField(blank=True, null=True)
    fax = models.TextField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    affiliation = models.TextField(blank=True, null=True)
    # TODO: split on semicolon
    roles = models.TextField(blank=True, null=True)
    # TODO: do we really want to store ontology information for this?    
    roles_accession = models.TextField(blank=True, null=True)
    roles_source = models.TextField(blank=True, null=True)

    def __unicode__(self):
        return unicode(self.first_name) + " " + unicode(self.last_name) + " (" + unicode( self.email ) + ")"


class Investigation(NodeCollection):
    isarchive_file = UUIDField(blank=True, null=True)    
    pre_isarchive_file = UUIDField(blank=True, null=True) 
    
    """easily retrieves the proper NodeCollection fields"""
    def get_identifier(self):
        print type(self.identifier)
        if (self.identifier == None) or (self.identifier.strip() == ""):
            #if there's no investigation identifier, then there's only 1 study
            study = self.study_set.all()[0]
            return study.identifier
        return self.identifier
    
    def get_title(self):
        if self.title == '' or self.title == None:
            study = self.study_set.all()[0]
            return study.title
        return self.title
    
    def get_description(self):
        if self.description == None or self.description == '':
            study = self.study_set.all()[0]
            return study.description
        return self.description
    
    def get_study_count(self):
        return self.study_set.count()
    
    def get_assay_count(self):
        studies = self.study_set.all()
        assay_count = 0
        for study in studies:
            assay_count += study.assay_set.count()

        return assay_count

class Ontology(models.Model):
    '''
    Ontology Source Reference (ISA-Tab Spec 4.1.1)
    '''
    investigation = models.ForeignKey(Investigation)
    name = models.TextField(blank=True, null=True)
    file_name = models.TextField(blank=True, null=True)
    version = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __unicode__(self):
        return unicode(self.name) + " (" + unicode(self.file_name) + ")"


class Study(NodeCollection):
    investigation = models.ForeignKey(Investigation)
    # TODO: should we support an archive file here? (see ISA-Tab Spec 4.1.3.2)
    file_name = models.TextField()
    
    def assay_nodes(self):
        self.node_set( type=Node.ASSAY )


    def __unicode__(self):
        return unicode(self.identifier) + ": " + unicode(self.title)
    
        
class Design(models.Model):
    '''
    Study Design Descriptor (ISA-Tab Spec 4.1.3.2)
    '''
    study = models.ForeignKey(Study)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)

    def __unicode__(self):
        return unicode(self.type)

    
class Factor(models.Model):
    '''
    Study Factor (ISA-Tab Spec 4.1.3.4)
    '''
    study = models.ForeignKey(Study)
    name = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)

    def __unicode__(self):
        return unicode(self.name) + ": " + unicode(self.type)


class Assay(models.Model):
    '''
    Study Assay (ISA-Tab Spec 4.1.3.5)
    '''
    uuid = UUIDField(unique=True, auto=True)
    study = models.ForeignKey(Study)
    measurement = models.TextField(blank=True, null=True)
    measurement_accession = models.TextField(blank=True, null=True)    
    measurement_source = models.TextField(blank=True, null=True)
    technology = models.TextField(blank=True, null=True)
    technology_accession = models.TextField(blank=True, null=True)    
    technology_source = models.TextField(blank=True, null=True)
    platform = models.TextField(blank=True, null=True)
    file_name = models.TextField()    

    def __unicode__(self):
        retstr = ""
        if self.measurement:
            retstr += "Measurement: %s; " % unicode(self.measurement)
        
        if self.technology:
            retstr += "Technology: %s; " % unicode(self.technology) 
        
        if self.platform:
            retstr += "Platform: %s; " % unicode(self.platform)

        retstr += "File: %s" % unicode(self.file_name)
        return retstr


class Protocol(models.Model):
    '''
    Study Protocol (ISA-Tab Spec 4.1.3.6)
    '''
    study = models.ForeignKey(Study)
    uuid = UUIDField(unique=True, auto=True)
    # workflow_uuid can be used to associate the protocol with a workflow
    # TODO: should this be the analysis uuid? (problem: technically an analysis is the execution of a protocol)
    workflow_uuid = UUIDField(unique=True, auto=True)
    version = models.TextField(blank=True, null=True) 
    name = models.TextField(blank=True, null=True)
    name_accession = models.TextField(blank=True, null=True)
    name_source = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    uri = models.TextField(blank=True, null=True)
    # protocol parameters: via FK
    # protocol components: via FK
    
    def __unicode__(self):
        return unicode(self.name) + ": " + unicode(self.type)


class ProtocolParameter(models.Model):
    study = models.ForeignKey(Study)
    protocol = models.ForeignKey(Protocol)
    name = models.TextField(blank=True, null=True)
    name_accession = models.TextField(blank=True, null=True)
    name_source = models.TextField(blank=True, null=True)
    

class ProtocolComponent(models.Model):
    study = models.ForeignKey(Study)
    protocol = models.ForeignKey(Protocol)    
    name = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)    
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)
    

class Node(models.Model):
    # allowed node types
    SOURCE = "Source Name"
    SAMPLE = "Sample Name"
    EXTRACT = "Extract Name"
    LABELED_EXTRACT = "Labeled Extract Name"

    SCAN = "Scan Name"
    NORMALIZATION = "Normalization Name"
    DATA_TRANSFORMATION = "Data Transformation Name"

    
    ASSAY = "Assay Name"
    HYBRIDIZATION_ASSAY = "Hybridization Assay Name"
    GEL_ELECTROPHORESIS_ASSAY = "Gel Electrophoresis Assay Name"
    NMR_ASSAY = "NMR Assay Name"
    MS_ASSAY = "MS Assay Name"
        
    ARRAY_DESIGN_FILE = "Array Design File"
    ARRAY_DESIGN_FILE_REF = "Array Design File REF"
    IMAGE_FILE = "Image File"    
    RAW_DATA_FILE = "Raw Data File"
    DERIVED_DATA_FILE = "Derived Data File"    
    ARRAY_DATA_FILE = "Array Data File"    
    DERIVED_ARRAY_DATA_FILE = "Derived Array Data File"    
    ARRAY_DATA_MATRIX_FILE = "Array Data Matrix File"
    DERIVED_ARRAY_DATA_MATRIX_FILE = "Derived Array Data Matrix File"
    SPOT_PICKING_FILE = "Spot Picking File"
    RAW_SPECTRAL_DATA_FILE = "Raw Spectral Data File"
    DERIVED_SPECTRAL_DATA_FILE = "Derived Spectral Data File"
    PEPTIDE_ASSIGNMENT_FILE = "Peptide Assignment File"
    PROTEIN_ASSIGNMENT_FILE = "Protein Assignment File"
    PTM_ASSIGNMENT_FILE = "Post Translational Modification Assignment File"
    FREE_INDUCTION_DECAY_DATA_FILE = "Free Induction Decay Data File"
    ACQUISITION_PARAMETER_DATA_FILE = "Aquisition Parameter Data File"
            
    ASSAYS = { 
        ASSAY,
        HYBRIDIZATION_ASSAY,
        MS_ASSAY,
        NMR_ASSAY,
        GEL_ELECTROPHORESIS_ASSAY 
    }
    
    FILES = {    
        ARRAY_DESIGN_FILE,
        ARRAY_DESIGN_FILE_REF,
        IMAGE_FILE,    
        RAW_DATA_FILE,
        DERIVED_DATA_FILE,    
        ARRAY_DATA_FILE,    
        DERIVED_ARRAY_DATA_FILE,    
        ARRAY_DATA_MATRIX_FILE,
        DERIVED_ARRAY_DATA_MATRIX_FILE,
        SPOT_PICKING_FILE,
        RAW_SPECTRAL_DATA_FILE,
        DERIVED_SPECTRAL_DATA_FILE,
        PEPTIDE_ASSIGNMENT_FILE,
        PROTEIN_ASSIGNMENT_FILE,
        PTM_ASSIGNMENT_FILE,
        FREE_INDUCTION_DECAY_DATA_FILE,
        ACQUISITION_PARAMETER_DATA_FILE
    }
    
    TYPES = ASSAYS | FILES | { SOURCE, SAMPLE, EXTRACT, LABELED_EXTRACT, SCAN, NORMALIZATION, DATA_TRANSFORMATION }     
        
    uuid = UUIDField(unique=True, auto=True)
    study = models.ForeignKey(Study, db_index=True)
    assay = models.ForeignKey(Assay, db_index=True, blank=True, null=True)
    file_uuid = UUIDField(default=None,blank=True, null=True,auto=False)
    children = models.ManyToManyField("self", symmetrical=False, related_name="parents_set")
    parents = models.ManyToManyField("self", symmetrical=False, related_name="children_set")
    type = models.TextField(db_index=True)
    name = models.TextField(db_index=True)
    
    def add_child(self, node):
        if node is None:
            return None
        
        self.children.add( node )
        self.save()
        node.parents.add( self )
        node.save()
        return self
            
    
    def __unicode__(self):
        return unicode(self.type) + ": " + unicode(self.name) + " (" + unicode( self.parents.count() ) + " parents, " + unicode( self.children.count() ) + " children)" 
    
    
class Attribute(models.Model):
    # allowed attribute types
    MATERIAL_TYPE = "Material Type"
    CHARACTERISTICS = "Characteristics"
    FACTOR_VALUE = "Factor Value"
    LABEL = "Label"
    COMMENT = "Comment"
    
    TYPES = { MATERIAL_TYPE, CHARACTERISTICS, FACTOR_VALUE, LABEL, COMMENT }
    
    ALL_FIELDS = ["id", "type", "subtype", "value", "value_unit", "value_accession", "value_source", "node"] 
    NON_ONTOLOGY_FIELDS = ["id", "type", "subtype", "value", "value_unit", "node"]     
    
    def is_attribute(self, string):
        return string.split( "[" )[0].strip() in self.TYPES     
        
    node = models.ForeignKey(Node, db_index=True)
    type = models.TextField(db_index=True)
    # subtype further qualifies the attribute type, e.g. type = factor value and subtype = age
    subtype = models.TextField(blank=True, null=True, db_index=True)
    value = models.TextField(blank=True, null=True, db_index=True)
    value_unit = models.TextField(blank=True, null=True)
    # if value_unit is not null value is numeric and value_accession and value_source refer to value_unit (rather than value)
    value_accession = models.TextField(blank=True, null=True)
    value_source = models.TextField(blank=True, null=True)
    
    def __unicode__(self):
        return unicode(self.type) + ( "" if self.subtype is None else " (" + unicode(self.subtype) + ")" ) + " = " + unicode(self.value) 

class AnnotatedNodeRegistry(models.Model):
    study = models.ForeignKey(Study, db_index=True)
    assay = models.ForeignKey(Assay, db_index=True, blank=True, null=True)
    node_type = models.TextField(db_index=True)
    creation_date = models.DateTimeField( auto_now_add=True )
    modification_date = models.DateTimeField( auto_now=True )    

class AnnotatedNode(models.Model):
    node = models.ForeignKey(Node, db_index=True)
    attribute = models.ForeignKey(Attribute, db_index=True)
    study = models.ForeignKey(Study, db_index=True)
    assay = models.ForeignKey(Assay, db_index=True, blank=True, null=True)
    node_uuid = UUIDField()
    node_file_uuid = UUIDField(blank=True, null=True)
    node_type = models.TextField(db_index=True)
    node_name = models.TextField(db_index=True)
    attribute_type = models.TextField(db_index=True)
    # subtype further qualifies the attribute type, e.g. type = factor value and subtype = age
    attribute_subtype = models.TextField(blank=True, null=True, db_index=True)
    attribute_value = models.TextField(blank=True, null=True, db_index=True)
    attribute_value_unit = models.TextField(blank=True, null=True)
     
                
class ProtocolReference(models.Model):
    node = models.ForeignKey(Node)
    protocol = models.ForeignKey(Protocol)
    performer = models.TextField(blank=True, null=True)
    # performer_uuid can be used to associate the execution with a user account
    performer_uuid = UUIDField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)         

    def __unicode__(self):
        return unicode( self.protocol ) + " (reference)" 
    
            
class ProtocolReferenceParameter(models.Model):
    protocol_reference = models.ForeignKey(ProtocolReference)
    name = models.TextField(blank=True, null=True)
    value = models.TextField(blank=True, null=True)
    value_unit = models.TextField(blank=True, null=True)
    # if value_unit is not null value is numeric and value_accession and value_source refer to value_unit (rather than value)
    value_accession = models.TextField(blank=True, null=True)
    value_source = models.TextField(blank=True, null=True)
    
    def __unicode__(self):
        return unicode(self.name) + " = " +  unicode(self.value) 




