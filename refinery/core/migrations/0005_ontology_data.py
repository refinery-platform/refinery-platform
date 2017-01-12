# encoding: utf8
import json
from django.core import serializers
from django.db import models, migrations


def forwards(apps, schema_editor):
    data = [
        {
            "model": "core.Ontology",
            "pk": 1,
            "fields": {
                "name": "BRENDA Tissue and Enzyme Source Ontology",
                "acronym": "BTO",
                "uri": "http://purl.obolibrary.org/obo/bto.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 2,
            "fields": {
                "name": "Chemical Entities of Biological Interest",
                "acronym": "CHEBI",
                "uri": "http://purl.obolibrary.org/obo/chebi.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 3,
            "fields": {
                "name": "Cell Ontology",
                "acronym": "CL",
                "uri": "http://purl.obolibrary.org/obo/cl.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 4,
            "fields": {
                "name": "Experimental Factor Ontology",
                "acronym": "EFO",
                "uri": "http://www.ebi.ac.uk/efo/efo.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 5,
            "fields": {
                "name": "Foundational Model of Anatomy",
                "acronym": "FMA",
                "uri": "http://purl.obolibrary.org/obo/fma.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 6,
            "fields": {
                "name": "Gene Ontology",
                "acronym": "GO",
                "uri": "http://purl.obolibrary.org/obo/go.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 7,
            "fields": {
                "name": "Mouse Adult Gross Anatomy",
                "acronym": "MA",
                "uri": "http://purl.obolibrary.org/obo/ma.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 8,
            "fields": {
                "name": "National Cancer Institute Thesaurus",
                "acronym": "NCIT",
                "uri": "http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 9,
            "fields": {
                "name": "Ontology for Biomedical Investigations",
                "acronym": "OBI",
                "uri": "http://purl.obolibrary.org/obo/obi.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 10,
            "fields": {
                "name": "Phenotypic Quality",
                "acronym": "PATO",
                "uri": "http://purl.obolibrary.org/obo/pato.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        },
        {
            "model": "core.Ontology",
            "pk": 11,
            "fields": {
                "name": "Unit Ontology",
                "acronym": "UO",
                "uri": "http://purl.obolibrary.org/obo/uo.owl",
                "owl2neo4j_version": "0.6.1",
                "import_date": "2016-05-19",
                "update_date": "2016-05-19"
            }
        }
    ]
    data_as_json = json.dumps([ob for ob in data])
    objects = serializers.deserialize('json', data_as_json,
                                      ignorenonexistent=True)
    for obj in objects:
        obj.save()

def backwards(apps, schema_editor):
    "Brutally deleting all entries for this model..."
    Ontology = apps.get_model("core", "Ontology")
    Ontology.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_auto_add_expiration'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]
