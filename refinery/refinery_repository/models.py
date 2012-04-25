"""
A compilation of models to represent the ISA-Tab format.  There are three 
types of models, corresponding to the three types of files in the ISA-Tab 
format: investigation, study, and assay.
"""
from django.db import models
from django_extensions.db.fields import UUIDField
from django.conf import settings

# Create your models here.
""" 
Tables Created from Investigation File
====================================== 
"""
class Ontology(models.Model):
    """
    Ontology: represents an ontology used to define terms
    -----------------------------------------------------
    """
    def __unicode__(self):
        return "%s: %s" % (self.term_source_name, self.term_source_file)
    
    term_source_name = models.TextField()
    """name of the ontology being used (e.g. OBI)"""
    term_source_version = models.TextField(blank=True, null=True)
    """version number to support tracking"""
    term_source_file = models.TextField(blank=True, null=True)
    """file name or URI of the ontology"""
    term_source_description = models.TextField(blank=True, null=True)
    """for disambiguating resources when homologous prefixes have been used"""
    
    class Meta:
        #even though pk is an auto-incremented number, ensures every row has a
        #unique combination of these three fields
        unique_together = ('term_source_name', 'term_source_file', 'term_source_version')

class StudyDesignDescriptor(models.Model):
    """
    `StudyDesignDescriptor`: A term allowing the classification of the study 
                             based on the overall experimental design
    ------------------------------------------------------------------------
    """
    def __unicode__(self):
        return self.study_design_type
    
    study_design_type = models.TextField()
    study_design_type_term_accession_number = models.TextField(blank=True, null=True)
    study_design_type_term_source_ref = models.TextField(blank=True, null=True)
    
    #linked Investigation
    investigation = models.ForeignKey('Investigation')

class StudyFactor(models.Model):
    """
    `StudyFactor`: A factor corresponds to an independent variable manipulated
                   by the experimentalist with the intention to affect 
                   biological systems in a way that can be measured by an 
                   assay
    --------------------------------------------------------------------------
    """
    def __unicode__(self):
        return self.study_factor_name
    
    study_factor_name = models.TextField()
    study_factor_type = models.TextField()
    study_factor_type_term_accession_number = models.TextField(blank=True, null=True)
    study_factor_type_term_source_ref = models.TextField(blank=True, null=True)
    
    #linked Investigation
    investigation = models.ForeignKey('Investigation')

class Protocol(models.Model):
    """
    `Protocol`: represents an protocol (either experimental or computational)
    -------------------------------------------------------------------------
    """
    def __unicode__(self):
        return self.study_protocol_name
    
    study_protocol_name = models.TextField(primary_key=True)
    study_protocol_type = models.TextField(blank=True, null=True)
    study_protocol_type_term_accession_number = models.TextField(blank=True, null=True)
    study_protocol_type_term_source_ref = models.TextField(blank=True, null=True)
    study_protocol_description = models.TextField(blank=True, null=True)
    study_protocol_uri = models.TextField(blank=True, null=True)
    study_protocol_version = models.TextField(blank=True, null=True)
    study_protocol_parameters_name = models.TextField(blank=True, null=True)
    study_protocol_parameters_name_term_accession_number = models.TextField(blank=True, null=True)
    study_protocol_parameters_name_term_source_ref = models.TextField(blank=True, null=True)
    study_protocol_components_name = models.TextField(blank=True, null=True)
    study_protocol_components_type = models.TextField(blank=True, null=True)
    study_protocol_components_type_term_accession_number = models.TextField(blank=True, null=True)
    study_protocol_components_type_term_source_ref = models.TextField(blank=True, null=True)

class Publication(models.Model):
    """
    `Publication`: represents a publication in a journal (or in submission)
    -----------------------------------------------------------------------
    """
    def __unicode__(self):
        return str(self.study_pubmed_id)
    
    study_pubmed_id = models.IntegerField(primary_key=True)
    study_publication_doi = models.TextField(blank=True, null=True)
    study_publication_author_list = models.TextField(blank=True, null=True)
    study_publication_title = models.TextField(blank=True, null=True)
    study_publication_status = models.TextField(blank=True, null=True)
    study_publication_status_term_accession_number = models.TextField(blank=True, null=True)
    study_publication_status_term_source_ref = models.TextField(blank=True, null=True)

class Investigation(models.Model):
    def __unicode__(self):
        return self.study_identifier

    investigation_uuid = UUIDField(unique=True, auto=True)
    study_identifier = models.TextField(primary_key=True)
    study_title = models.TextField()
    study_description = models.TextField(blank=True, null=True)
    study_public_release_date = models.DateField(blank=True, null=True)
    study_submission_date = models.DateField(blank=True, null=True)
    study_file_name = models.TextField()
    
    #investigation header stuff
    investigation_identifier = models.TextField(blank=True, null=True)
    investigation_title = models.TextField(blank=True, null=True)
    investigation_description = models.TextField(blank=True, null=True)
    investigation_submission_date = models.DateField(blank=True, null=True)
    investigation_public_release_date = models.DateField(blank=True, null=True)
    
    #associated zipped files
    pre_isatab_file = models.FilePathField(path=settings.ISA_TAB_DIR, match=r"\S{3,}_\S{3,}\.zip", recursive=True, blank=True, null=True)
    isatab_file = models.FilePathField(path=settings.ISA_TAB_DIR, match=r'\S{3,}\.zip', recursive=True, blank=True, null=True)
    
    #0, 1, or more ontologies, protocols, or publications can be used for 
    #many different investigations
    ontologies = models.ManyToManyField(Ontology, blank=True, null=True)
    protocols = models.ManyToManyField(Protocol, blank=True, null=True)
    publications = models.ManyToManyField(Publication, blank=True, null=True)

class StudyAssay(models.Model):
    """
    `StudyAssay`: declares and describes each of the Assay files associated 
                  with the current Study
    """
    def __unicode__(self):
        return self.study_assay_file_name

    study_assay_measurement_type = models.TextField(blank=True, null=True)
    study_assay_measurement_type_term_accession_number = models.TextField(blank=True, null=True)
    study_assay_measurement_type_term_source_ref = models.TextField(blank=True, null=True)
    study_assay_technology_type = models.TextField(blank=True, null=True)
    study_assay_technology_type_term_accession_number = models.TextField(blank=True, null=True)
    study_assay_technology_type_term_source_ref = models.TextField(blank=True, null=True)
    study_assay_technology_platform = models.TextField(blank=True, null=True)
    study_assay_file_name = models.TextField()
    
    investigation = models.ForeignKey(Investigation)

class Investigator(models.Model):
    """
    `Investigator`: Experiment contacts
    -----------------------------------
    """
    def __unicode__(self):
        name = "%s, %s %s" % (self.study_person_last_name, 
                              self.study_person_first_name, 
                              self.study_person_mid_initials)
        return name

    study_person_email = models.EmailField(max_length=1024, primary_key=True)
    study_person_last_name = models.TextField()
    study_person_first_name = models.TextField()
    study_person_mid_initials = models.TextField(blank=True, null=True)
    study_person_phone = models.TextField(blank=True, null=True)
    study_person_fax = models.TextField(blank=True, null=True)
    study_person_address = models.TextField()
    study_person_affiliation = models.TextField()
    study_person_roles = models.TextField()
    study_person_roles_term_accession_number = models.TextField(blank=True, null=True)
    study_person_roles_term_source_ref = models.TextField(blank=True, null=True)
    
    investigations = models.ManyToManyField(Investigation)

    
""" 
Tables Created from Study File
============================== 
"""
class Study(models.Model):
    def __unicode__(self):
        return self.source_name
    
    study_uuid = UUIDField(unique=True, auto=True)
    source_name = models.TextField(primary_key=True)
    sample_name = models.TextField()
    
    #optional fields
    material_type = models.TextField(blank=True, null=True)
    material_type_term_source_ref = models.TextField(blank=True, null=True)
    material_type_term_accession_number = models.TextField(blank=True, null=True)
    provider = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True) 
    
    #usually more than one protocol per study
    protocols = models.ManyToManyField(Protocol)
    investigation = models.ForeignKey(Investigation)
        
    def factorvalue_set(self):
        return self.studybracketedfield_set.filter(type="factor_value")
    
    def parametervalue_set(self):
        return self.studybracketedfield_set.filter(type="parameter_value")
    
    def comment_set(self):
        return self.studybracketedfield_set.filter(type="comment")
    
    def characteristics_set(self):
        return self.studybracketedfield_set.filter(type="characteristics")

class StudyBracketedField(models.Model):
    def __unicode__(self):
        return "%s[%s]: %s" % (self.type, self.sub_type, self.value)
    #required fields
    value = models.TextField()
    #characteristic, factor value, parameter value, comment
    type = models.TextField()
    #stuff between the brackets
    sub_type = models.TextField()
    #node name and position for correlation
    node_name = models.TextField()
    node_index = models.IntegerField()

    #optional fields
    term_source_ref = models.TextField(blank=True, null=True)
    term_accession_number = models.TextField(blank=True, null=True)
    unit = models.TextField(blank=True, null=True)
    unit_term_source_ref = models.TextField(blank=True, null=True)
    unit_term_accession_number = models.TextField(blank=True, null=True)
    #performed protocol/date protocol performed if parameter value
    performer = models.TextField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)

    #foreign keys
    study = models.ForeignKey(Study)
    #if a parameter value, it's associated with a Protocol
    protocol = models.ForeignKey(Protocol, blank=True, null=True)


"""
Tables Created from Assay File
============================== 
"""
class RawData(models.Model):
    """
    `RawData`: represents raw data files
    ------------------------------------
    """
    def __unicode__(self):
        return self.raw_data_file

    rawdata_uuid = UUIDField(unique=True, auto=False, blank=True, null=True)
    raw_data_file = models.TextField()
    file_name = models.TextField()
    
class ProcessedData(models.Model):
    """
    `ProcessedData`: represents processed data files
    ------------------------------------------------
    """
    def __unicode__(self):
        return self.derived_data_file

    processeddata_uuid = UUIDField(unique=True, auto=False, blank=True, null=True)
    file_name = models.TextField(blank=True, null=True)
    derived_data_file = models.TextField()
    
class Assay(models.Model):
    def __unicode__(self):
        return self.sample_name

    assay_uuid = UUIDField(unique=True, auto=True)
    sample_name = models.TextField()
    material_type = models.TextField(blank=True, null=True)
    material_type_term_source_ref = models.TextField(blank=True, null=True)
    material_type_term_accession_number = models.TextField(blank=True, null=True)
    
    #extract name node
    extract_name = models.TextField(blank=True, null=True)
    extract_name_material_type = models.TextField(blank=True, null=True)
    extract_name_material_type_term_source_ref = models.TextField(blank=True, null=True)
    extract_name_material_type_term_accession_number = models.TextField(blank=True, null=True)
    extract_name_description = models.TextField(blank=True, null=True)
    
    #labeled extract name node
    labeled_extract_name = models.TextField(blank=True, null=True)
    labeled_extract_name_material_type = models.TextField(blank=True, null=True)
    labeled_extract_name_material_type_term_source_ref = models.TextField(blank=True, null=True)
    labeled_extract_name_material_type_term_accession_number = models.TextField(blank=True, null=True)
    labeled_extract_name_description = models.TextField(blank=True, null=True)
    label = models.TextField(blank=True, null=True)
    label_term_source_ref = models.TextField(blank=True, null=True)
    label_term_accession_number = models.TextField(blank=True, null=True)
    
    #assay name node
    assay_name = models.TextField(blank=True, null=True)
    assay_name_performer = models.TextField(blank=True, null=True)
    assay_name_date = models.DateField(blank=True, null=True)
    
    #image name, normalization name, and data transformation name nodes
    image_name = models.TextField(blank=True, null=True)
    normalization_name = models.TextField(blank=True, null=True)
    
    #random other fields
    technology_type = models.TextField(blank=True, null=True)
    scan_name = models.TextField(blank=True, null=True)
    array_design_ref = models.TextField(blank=True, null=True)
    
    #one raw/processed data file may be associated with multiple assays
    raw_data = models.ManyToManyField(RawData, null=True, blank=True)
    processed_data = models.ManyToManyField(ProcessedData, blank=True, null=True)
    #protocols can be recycled
    protocols = models.ManyToManyField(Protocol)
    
    investigation = models.ForeignKey(Investigation)
    study = models.ForeignKey(Study)
    
    def factorvalue_set(self):
        return self.assaybracketedfield_set.filter(type="factor_value")
    
    def parametervalue_set(self):
        return self.assaybracketedfield_set.filter(type="parameter_value")
    
    def comment_set(self):
        return self.assaybracketedfield_set.filter(type="comment")
    
    def characteristics_set(self):
        return self.assaybracketedfield_set.filter(type="characteristics")

class DataTransformation(models.Model):
    def __unicode__(self):
        return self.data_transformation_name
    data_transformation_name = models.TextField()
    performer = models.TextField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    
    #foreign keys
    assay = models.ForeignKey(Assay)
    protocol = models.ForeignKey(Protocol)
    
class AssayBracketedField(models.Model):
    def __unicode__(self):
        return "%s[%s]: %s" % (self.type, self.sub_type, self.value)
    #required fields
    value = models.TextField()
    #characteristic, factor value, parameter value, comment
    type = models.TextField()
    #stuff in between the brackets
    sub_type = models.TextField()
    #node name and position for correlation
    node_name = models.TextField()
    node_index = models.IntegerField()
    
    #optional fields
    term_source_ref = models.TextField(blank=True, null=True)
    term_accession_number = models.TextField(blank=True, null=True)
    unit = models.TextField(blank=True, null=True)
    unit_term_source_ref = models.TextField(blank=True, null=True)
    unit_term_accession_number = models.TextField(blank=True, null=True)
    #performed protocol/date protocol performed if parameter value
    performer = models.TextField(blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    
    #foreign keys
    assay = models.ForeignKey(Assay)
    #if a parameter value, it's associated with a Protocol
    protocol = models.ForeignKey(Protocol, blank=True, null=True)