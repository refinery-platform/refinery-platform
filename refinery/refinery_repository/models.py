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
    `Ontology` 
    ----------
    Represents an ontology used to define terms
    
    Because many investigations can use various ontologies, they are connected
    via a many-to-many relationship.
    """
    def __unicode__(self):
        return "%s: %s" % (self.term_source_name, self.term_source_file)
    
    term_source_name = models.TextField()
    """Name of the ontology being used (e.g. OBI)"""
    term_source_version = models.TextField(blank=True, null=True)
    """Version number to support tracking"""
    term_source_file = models.TextField(blank=True, null=True)
    """File name or URI of the ontology"""
    term_source_description = models.TextField(blank=True, null=True)
    """For disambiguating resources when homologous prefixes have been used"""
    
    class Meta:
        #even though pk is an auto-incremented number, ensures every row has a
        #unique combination of these three fields
        unique_together = ('term_source_name', 'term_source_file', 'term_source_version')

class StudyDesignDescriptor(models.Model):
    """
    `StudyDesignDescriptor`
    -----------------------
    A term allowing the classification of the study based on the overall 
    experimental design
    """
    def __unicode__(self):
        return self.study_design_type
    
    study_design_type = models.TextField()
    """Classification of the study based on the overall experimental design"""
    study_design_type_term_accession_number = models.TextField(blank=True, null=True)
    """Accession number from the Term Source associated with the study design type"""
    study_design_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""

    investigation = models.ForeignKey('Investigation')
    """Linked `Investigation`"""

class StudyFactor(models.Model):
    """
    `StudyFactor` 
    -------------
    A factor corresponds to an independent variable manipulated by the 
    experimentalist with the intention to affect biological systems in a way 
    that can be measured by an assay
    """
    def __unicode__(self):
        return self.study_factor_name
    
    study_factor_name = models.TextField()
    """
    The name of one factor (an independent variable manipulated by the 
    experimentalist with the intention to affect biological systems in a way 
    that can be measured by an assay) used in the `Study` and/or `Assay`
    """
    study_factor_type = models.TextField()
    """A term allowing the classification of this factor into categories"""
    study_factor_type_term_accession_number = models.TextField(blank=True, null=True)
    """Accession number from the Term Source associated with the study factor"""
    study_factor_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    
    investigation = models.ForeignKey('Investigation')
    """Linked `Investigation`"""

class Protocol(models.Model):
    """
    `Protocol`
    ----------
    Represents a protocol (either experimental or computational)
    
    `Investigation`s and `Protocol`s are linked by a many-to-many relationship.
    """
    def __unicode__(self):
        return self.study_protocol_name
    
    study_protocol_name = models.TextField(primary_key=True)
    """
    Name of the protocol used within the ISA-TAB document. The names are used 
    as identifiers within the ISA-TAB document and will be referenced in the 
    Study and Assay files in the Protocol REF columns. Names can be either 
    local identifiers, unique within the ISA Archive which contains them, or 
    fully qualified external accession numbers.
    """
    study_protocol_type = models.TextField(blank=True, null=True)
    """Term to classify the protocol"""
    study_protocol_type_term_accession_number = models.TextField(blank=True, null=True)
    """Accession number from the Term Source associated with the protocol"""
    study_protocol_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    study_protocol_description = models.TextField(blank=True, null=True)
    """A free-text description of the protocol"""
    study_protocol_uri = models.TextField(blank=True, null=True)
    """
    Pointer to protocol resources external to the ISA-TAB file that can be 
    accessed by their Uniform Resource Identifier (URI)
    """
    study_protocol_version = models.TextField(blank=True, null=True)
    """Version number to support tracking"""
    study_protocol_parameters_name = models.TextField(blank=True, null=True)
    """
    A semicolon-delimited (";") list of parameter names, used as an 
    identifier within the `Investigation`. These names are used in the 
    `StudyBracketedField` and `AssayBracketedField` models with 
    ``type='parameter_value'`` to list the values used for each protocol 
    parameter.
    """
    study_protocol_parameters_name_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the parameter names
    """
    study_protocol_parameters_name_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    study_protocol_components_name = models.TextField(blank=True, null=True)
    """
    A semicolon delimited list of a protocol's components; e.g. instrument 
    names, software names, and reagent names
    """
    study_protocol_components_type = models.TextField(blank=True, null=True)
    """
    Term to classify the protocol components listed in 
    `study_protocol_components_name`.
    """
    study_protocol_components_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the protocol 
    components
    """
    study_protocol_components_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""

class Publication(models.Model):
    """
    `Publication`: represents a publication in a journal (or in submission)
    -----------------------------------------------------------------------
    """
    def __unicode__(self):
        return str(self.study_pubmed_id)
    
    study_pubmed_id = models.IntegerField(primary_key=True)
    """
    The PubMed ID of the publication associated with this study 
    (where available)
    """
    study_publication_doi = models.TextField(blank=True, null=True)
    """
    A Digital Object Identifier (DOI) for this publication (where available)
    """
    study_publication_author_list = models.TextField(blank=True, null=True)
    """The list of authors associated with this publication"""
    study_publication_title = models.TextField(blank=True, null=True)
    """The title of this publication"""
    study_publication_status = models.TextField(blank=True, null=True)
    """
    A term describing the status of this publication (i.e. submitted, in 
    preparation, published)
    """
    study_publication_status_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the publication 
    status
    """
    study_publication_status_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""

class Investigation(models.Model):
    def __unicode__(self):
        return self.study_identifier

    investigation_uuid = UUIDField(unique=True, auto=True)
    """UUID of the `Investigation` for passing around Refinery"""
    study_identifier = models.TextField(blank=True, null=True)
    """
    A unique identifier: either a temporary identifier supplied by users or 
    one generated by a repository or other database
    """
    study_title = models.TextField()
    """
    A concise phrase used to encapsulate the purpose and goal of the study
    """
    study_description = models.TextField(blank=True, null=True)
    """
    A textual description of the study, with components such as objective or 
    goals
    """
    study_submission_date = models.DateField(blank=True, null=True)
    """The date on which the study is submitted to an archive."""
    study_public_release_date = models.DateField(blank=True, null=True)
    """The date on which the study should be released publicly"""
    study_file_name = models.TextField()
    """
    A field to specify the name of the Study file corresponding the 
    definition of that study
    """
    
    """
    The Investigation section provides a flexible mechanism for grouping two 
    or more Study files where required.
    """
    investigation_identifier = models.TextField(blank=True, null=True)
    """
    A locally unique identifier or an accession number provided by a 
    repository
    """
    investigation_title = models.TextField(blank=True, null=True)
    """A concise name given to the investigation"""
    investigation_description = models.TextField(blank=True, null=True)
    """A textual description of the investigation"""
    investigation_submission_date = models.DateField(blank=True, null=True)
    """The date on which the investigation was reported to the repository"""
    investigation_public_release_date = models.DateField(blank=True, null=True)
    """The date on which the investigation should be released publicly"""
    
    #associated zipped files
    pre_isatab_file = UUIDField(unique=True, auto=False, blank=True, null=True) 
    isatab_file = UUIDField(unique=True, auto=False, blank=True, null=True)
    
    #0, 1, or more ontologies, protocols, or publications can be used for 
    #many different investigations
    ontologies = models.ManyToManyField(Ontology, blank=True, null=True)
    """List of `Ontology` objects this `Investigation` uses"""
    protocols = models.ManyToManyField(Protocol, blank=True, null=True)
    """List of `Protocol`s used in this `Investigation`"""
    publications = models.ManyToManyField(Publication, blank=True, null=True)
    """List of `Publication`s associated with this `Investigation`"""

class StudyAssay(models.Model):
    """
    `StudyAssay`: declares and describes each of the Assay files associated 
                  with the current Study
    """
    def __unicode__(self):
        return self.study_assay_file_name

    study_assay_measurement_type = models.TextField(blank=True, null=True)
    """
    A term to qualify the endpoint, or what is being measured (e.g. gene 
    expression profiling or protein identification)
    """
    study_assay_measurement_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the study assay 
    measurement type
    """
    study_assay_measurement_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    study_assay_technology_type = models.TextField(blank=True, null=True)
    """
    Term to identify the technology used to perform the measurement, e.g. DNA 
    microarray, mass spectrometry
    """
    study_assay_technology_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the study assay 
    technology type
    """
    study_assay_technology_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    study_assay_technology_platform = models.TextField(blank=True, null=True)
    """Manufacturer and platform name, e.g. Bruker AVANCE"""
    study_assay_file_name = models.TextField()
    """
    A field to specify the name of the Assay file corresponding the 
    definition of that assay
    """
    
    investigation = models.ForeignKey(Investigation)
    """Linked `Investigation`"""

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
    """The email address of a person associated with the study"""
    study_person_last_name = models.TextField()
    """The last name of a person associated with the study"""
    study_person_first_name = models.TextField()
    """The first name of a person associated with the study"""
    study_person_mid_initials = models.TextField(blank=True, null=True)
    """The middle initial(s) of a person associated with the study"""
    study_person_phone = models.TextField(blank=True, null=True)
    """The telephone number of a person associated with the study"""
    study_person_fax = models.TextField(blank=True, null=True)
    """The fax number of a person associated with the study"""
    study_person_address = models.TextField()
    """The address of a person associated with the study"""
    study_person_affiliation = models.TextField()
    """The organization affiliation for a person associated with the study"""
    study_person_roles = models.TextField()
    """
    Term to classify the role(s) performed by this person in the context of 
    the study
    """
    study_person_roles_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the role
    """
    study_person_roles_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    
    investigations = models.ManyToManyField(Investigation)
    """`Investigation`s that an `Investigator` has """

    
""" 
Tables Created from Study File
============================== 
"""
class Study(models.Model):
    def __unicode__(self):
        return self.source_name
    
    study_uuid = UUIDField(unique=True, auto=True)
    """UUID of the `Study` for passing around Refinery"""
    source_name = models.TextField()
    """
    Sources are considered as the starting biological material used in a study
    """
    sample_name = models.TextField()
    """
    Samples represent major outputs resulting from a protocol application
    """
    
    #optional fields
    material_type = models.TextField(blank=True, null=True)
    """An attribute"""
    material_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    material_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the material type
    """
    provider = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True) 
    
    #usually more than one protocol per study
    protocols = models.ManyToManyField(Protocol)
    investigation = models.ForeignKey(Investigation)
    """Linked `Investigation`"""
        
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
    type = models.TextField()
    """Characteristic, Factor Value, Parameter Value, or Comment"""
    sub_type = models.TextField()
    """Stuff between the brackets (e.g. Parameter Value[<parameter term>])"""
    #node name and position for correlation
    node_name = models.TextField()
    node_index = models.IntegerField()

    #optional fields
    term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the unit
    """
    unit = models.TextField(blank=True, null=True)
    """Used to classify data that are dimensional"""
    unit_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    unit_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the unit
    """
    performer = models.TextField(blank=True, null=True)
    """
    Name of the operator who carried out the protocol
    This is only applicable if ``type='parameter_value'``
    """
    date = models.DateField(blank=True, null=True)
    """
    The date on which a protocol is performed
    This allows account to be taken of day effects and can be part of a 
    quality control data tracking.
    This is only applicable if ``type='parameter_value'``
    """

    #foreign keys
    study = models.ForeignKey(Study)
    """Linked `Study`"""
    protocol = models.ForeignKey(Protocol, blank=True, null=True)
    """If ``type='parameter_value'``, this is the associated `Protocol`."""


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

    rawdata_uuid = UUIDField(unique=True, auto=False)
    """UUID of the corresponding FileStore object"""
    raw_data_file = models.TextField()
    """Name (or URI) of raw data file"""
    file_name = models.TextField()
    """Name of the raw data file"""
    
    class Meta:
        #even though pk is an auto-incremented number, ensures every row has a
        #unique combination of these three fields
        unique_together = ('raw_data_file', 'file_name')

    
class ProcessedData(models.Model):
    """
    `ProcessedData`: represents processed data files
    ------------------------------------------------
    """
    def __unicode__(self):
        return self.derived_data_file

    processeddata_uuid = UUIDField(unique=True, auto=False)
    """UUID of the corresponding FileStore object"""
    file_name = models.TextField(blank=True, null=True)
    """Name of the processed data file"""
    derived_data_file = models.TextField()
    """
    Name (or URI) of files resulting from data transformation or processing
    """
    
    class Meta:
        #even though pk is an auto-incremented number, ensures every row has a
        #unique combination of these three fields
        unique_together = ('derived_data_file', 'file_name')
    
class Assay(models.Model):
    def __unicode__(self):
        return self.sample_name

    assay_uuid = UUIDField(unique=True, auto=True)
    """UUID of the `Assay` for passing around Refinery"""
    sample_name = models.TextField()
    """
    Used as an identifier to associate `Assay` with `source_name` in the 
    corresponding `Study`
    """
    material_type = models.TextField(blank=True, null=True)
    """An attribute column for `sample_name`"""
    material_type_term_source_ref = models.TextField(blank=True, null=True)
    material_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the material type
    """

    #extract name node
    extract_name = models.TextField(blank=True, null=True)
    """user-defined names for each portion of extracted material"""
    extract_name_material_type = models.TextField(blank=True, null=True)
    """An attribute column for `extract_name`"""
    extract_name_material_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    extract_name_material_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the extract's
    material type
    """
    extract_name_description = models.TextField(blank=True, null=True)
    
    #labeled extract name node
    labeled_extract_name = models.TextField(blank=True, null=True)
    """An identifier within an Assay file"""
    labeled_extract_name_material_type = models.TextField(blank=True, null=True)
    """An attribute column for `labeled_extract_name`"""
    labeled_extract_name_material_type_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    labeled_extract_name_material_type_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the labeled 
    extract's material type
    """
    labeled_extract_name_description = models.TextField(blank=True, null=True)
    label = models.TextField(blank=True, null=True)
    """
    Indicates a chemical or biological marker, such as a radioactive isotope 
    or a fluorescent dye which is bound to a material in order to make it 
    detectable by some assay technology (e.g. P33, biotin, GFP)
    """
    label_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    label_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the label
    """
    
    #assay name node
    assay_name = models.TextField(blank=True, null=True)
    """User-defined names for each assay"""
    assay_name_performer = models.TextField(blank=True, null=True)
    assay_name_date = models.DateField(blank=True, null=True)
    
    #image name, normalization name, and data transformation name nodes
    image_name = models.TextField(blank=True, null=True)
    """Names (or URIs) of the image files generated by an assay"""
    normalization_name = models.TextField(blank=True, null=True)
    
    #random other fields
    technology_type = models.TextField(blank=True, null=True)
    scan_name = models.TextField(blank=True, null=True)
    """User-defined name for each Scan event"""
    array_design_file = models.TextField(blank=True, null=True)
    """
    Name of file containing the array design, used for a particular 
    hybridization
    """
    array_design_ref = models.TextField(blank=True, null=True)
    """
    Identifier (or accession number) of an existing array design
    """
    array_design_ref_term_source_ref = models.TextField(blank=True, null=True)
    array_design_ref_term_accession_number = models.TextField(blank=True, null=True)
    
    #one raw/processed data file may be associated with multiple assays
    raw_data = models.ManyToManyField(RawData, null=True, blank=True)
    processed_data = models.ManyToManyField(ProcessedData, blank=True, null=True)
    #protocols can be recycled
    protocols = models.ManyToManyField(Protocol)
    
    investigation = models.ForeignKey(Investigation)
    """Linked `Investigation`"""
    study = models.ForeignKey(Study)
    """Linked `Study`"""
    
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
    """Linked `Assay`"""
    protocol = models.ForeignKey(Protocol)
    """`Protocol` performed for this data transformation"""
    
class AssayBracketedField(models.Model):
    def __unicode__(self):
        return "%s[%s]: %s" % (self.type, self.sub_type, self.value)
    #required fields
    value = models.TextField()
    type = models.TextField()
    """Characteristic, Factor Value, Parameter Value, or Comment"""
    sub_type = models.TextField()
    """Stuff between the brackets (e.g. Parameter Value[<parameter term>])"""
    #node name and position for correlation
    node_name = models.TextField()
    node_index = models.IntegerField()
    
    #optional fields
    term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the 
    """
    unit = models.TextField(blank=True, null=True)
    unit_term_source_ref = models.TextField(blank=True, null=True)
    """Identifies the controlled vocabulary or ontology that this comes from"""
    unit_term_accession_number = models.TextField(blank=True, null=True)
    """
    Accession number from the Term Source associated with the unit
    """
    performer = models.TextField(blank=True, null=True)
    """
    Name of the operator who carried out the protocol
    This is only applicable if ``type='parameter_value'``
    """
    date = models.DateField(blank=True, null=True)
    """
    The date on which a protocol is performed
    This allows account to be taken of day effects and can be part of a 
    quality control data tracking.
    This is only applicable if ``type='parameter_value'``
    """
    
    #foreign keys
    assay = models.ForeignKey(Assay)
    """Linked `Assay`"""
    protocol = models.ForeignKey(Protocol, blank=True, null=True)
    """If ``type='parameter_value'``, this is the associated `Protocol`."""