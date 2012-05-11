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
    release_date = models.TextField(blank=True, null=True)    
            
    class Meta:
        # this cannot be abstract due to the foreign keys from publications, investigators, etc.
        #abstract = True
        pass


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


class Investigation(NodeCollection):    
    pass


class OntologyDeclaration(models.Model):
    '''
    Ontology Source Reference (ISA-Tab Spec 4.1.1)
    '''
    investigation = models.ForeignKey(Investigation)
    name = models.TextField(blank=True, null=True)
    file_name = models.TextField(blank=True, null=True)
    version = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)


class Study(NodeCollection):
    investigation = models.ForeignKey(Investigation)
    # TODO: should we support an archive file here? (see ISA-Tab Spec 4.1.3.2)
    file_name = models.TextField(blank=True, null=True)
    
        
class Design(models.Model):
    '''
    Study Design Descriptor (ISA-Tab Spec 4.1.3.2)
    '''
    study = models.ForeignKey(Study)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)

    
class FactorDeclaration(models.Model):
    '''
    Study Factor (ISA-Tab Spec 4.1.3.4)
    '''
    study = models.ForeignKey(Study)
    name = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)


class AssayDeclaration(models.Model):
    '''
    Study Assay (ISA-Tab Spec 4.1.3.5)
    '''
    study = models.ForeignKey(Study)
    measurement = models.TextField(blank=True, null=True)
    measurement_accession = models.TextField(blank=True, null=True)    
    measurement_source = models.TextField(blank=True, null=True)
    technology = models.TextField(blank=True, null=True)
    technology_accession = models.TextField(blank=True, null=True)    
    technology_source = models.TextField(blank=True, null=True)
    platform = models.TextField(blank=True, null=True)
    file_name = models.TextField(blank=True, null=True)    


class Protocol(models.Model):
    '''
    Study Protocol (ISA-Tab Spec 4.1.3.6)
    '''
    study = models.ForeignKey(Study)
    uuid = UUIDField(unique=True, auto=True)
    # workflow_uuid can be used to associate the protocol with a workflow
    # TODO: should this be the analysis uuid? (problem: technically an analysis is the execution of a protocol)
    workflow_uuid = UUIDField(unique=True, auto=True)
    name = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    type_accession = models.TextField(blank=True, null=True)
    type_source = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    uri = models.TextField(blank=True, null=True)
    # TODO: add protocol parameters
    # TODO: add protocol components
    
    def __unicode__(self):
        return self.name


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
    study = models.ForeignKey(Study)
    children = models.ManyToManyField("self", symmetrical=False, related_name="parents_set")
    parents = models.ManyToManyField("self", symmetrical=False, related_name="children_set")
    type = models.TextField()
    name = models.TextField()
    
    def __unicode__(self):
        return self.type + ": " + self.name + " (" + str( self.parents.count() ) + " parents, " + str( self.children.count() ) + " children)" 
    
    
class Attribute(models.Model):
    # allowed attribute types
    MATERIAL_TYPE = "Material Type"
    CHARACTERISTICS = "Characteristics"
    FACTOR_VALUE = "Factor Value"
    LABEL = "Label"
    
    TYPES = { MATERIAL_TYPE, CHARACTERISTICS, FACTOR_VALUE, LABEL }
    
    def is_attribute(self, string):
        return string.split( "[" )[0].strip() in self.TYPES     
        
    node = models.ForeignKey(Node)
    type = models.TextField()
    # subtype further qualifies the attribute type, e.g. type = factor value and subtype = age
    subtype = models.TextField(blank=True, null=True)
    value = models.TextField(blank=True, null=True)
    value_unit = models.TextField(blank=True, null=True)
    # if value_unit is not null value is numeric and value_accession and value_source refer to value_unit (rather than value)
    value_accession = models.TextField(blank=True, null=True)
    value_source = models.TextField(blank=True, null=True)
    
    def __unicode__(self):
        return self.type + ( "" if self.subtype is None else " (" + self.subtype + ")" ) + " = " +  self.value 

    
        
class ProtocolReference(models.Model):
    node = models.ForeignKey(Node)
    protocol = models.ForeignKey(Protocol)
    performer = models.TextField(blank=True, null=True)
    # performer_uuid can be used to associate the execution with a user account
    performer_uuid = UUIDField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)         

    def __unicode__(self):
        return str( self.protocol ) + " (reference)" 
    
            
class ProtocolReferenceParameter(models.Model):
    protocol_reference = models.ForeignKey(ProtocolReference)
    name = models.TextField(blank=True, null=True)
    value = models.TextField(blank=True, null=True)
    value_unit = models.TextField(blank=True, null=True)
    # if value_unit is not null value is numeric and value_accession and value_source refer to value_unit (rather than value)
    value_accession = models.TextField(blank=True, null=True)
    value_source = models.TextField(blank=True, null=True)
    
    def __unicode__(self):
        return self.name + " = " +  self.value 
    

