# encoding: utf8
from django.db import migrations, IntegrityError, transaction


def forwards(apps, schema_editor):
    Ontology = apps.get_model("core", "Ontology")
    ontologies = [
        Ontology(
            name="BRENDA Tissue and Enzyme Source Ontology",
            acronym="BTO",
            uri="http://purl.obolibrary.org/obo/bto.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(

            name="Chemical Entities of Biological Interest",
            acronym="CHEBI",
            uri="http://purl.obolibrary.org/obo/chebi.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Cell Ontology",
            acronym="CL",
            uri="http://purl.obolibrary.org/obo/cl.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Experimental Factor Ontology",
            acronym="EFO",
            uri="http://www.ebi.ac.uk/efo/efo.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Foundational Model of Anatomy",
            acronym="FMA",
            uri="http://purl.obolibrary.org/obo/fma.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Gene Ontology",
            acronym="GO",
            uri="http://purl.obolibrary.org/obo/go.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Mouse Adult Gross Anatomy",
            acronym="MA",
            uri="http://purl.obolibrary.org/obo/ma.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="National Cancer Institute Thesaurus",
            acronym="NCIT",
            uri="http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Ontology for Biomedical Investigations",
            acronym="OBI",
            uri="http://purl.obolibrary.org/obo/obi.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Phenotypic Quality",
            acronym="PATO",
            uri="http://purl.obolibrary.org/obo/pato.owl",
            owl2neo4j_version="0.6.1",
        ),
        Ontology(
            name="Unit Ontology",
            acronym="UO",
            uri="http://purl.obolibrary.org/obo/uo.owl",
            owl2neo4j_version="0.6.1",
        )
    ]
    for ontology in ontologies:
        # Attempt to save Ontology objects. If an IntegrityError is raised
        # upon saving an object we continue as it already exists.
        try:
            with transaction.atomic():
                ontology.save()
        except IntegrityError:
            continue


def backwards(apps, schema_editor):
    """Brutally deleting all entries for this model..."""
    Ontology = apps.get_model("core", "Ontology")
    Ontology.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_auto_add_expiration'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]
