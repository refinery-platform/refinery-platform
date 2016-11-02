# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import json

from django.core import serializers
from django.db import models, migrations

def forwards(apps, schema_editor):
    data = [{
              "pk": 1,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "includes",
                "name": "LK3 transgenic mice"
              }
            },
            {
              "pk": 2,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "misnomer",
                "name": "Mus muscaris"
              }
            },
            {
              "pk": 3,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "scientific name",
                "name": "Mus musculus"
              }
            },
            {
              "pk": 4,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "Mus musculus",
                "type": "abbreviation",
                "name": "M. musculus"
              }
            },
            {
              "pk": 5,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "authority",
                "name": "Mus musculus Linnaeus, 1758"
              }
            },
            {
              "pk": 6,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "includes",
                "name": "Mus sp. 129SV"
              }
            },
            {
              "pk": 7,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "genbank common name",
                "name": "house mouse"
              }
            },
            {
              "pk": 8,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "misspelling",
                "name": "mice C57BL/6xCBA/CaJ hybrid"
              }
            },
            {
              "pk": 9,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "common name",
                "name": "mouse"
              }
            },
            {
              "pk": 10,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "includes",
                "name": "nude mice"
              }
            },
            {
              "pk": 11,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 10090,
                "unique_name": "",
                "type": "includes",
                "name": "transgenic mice"
              }
            },
            {
              "pk": 12,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "",
                "type": "scientific name",
                "name": "Caenorhabditis elegans"
              }
            },
            {
              "pk": 13,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "Caenorhabditis elegans",
                "type": "abbreviation",
                "name": "C. elegans"
              }
            },
            {
              "pk": 14,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "",
                "type": "authority",
                "name": "Caenorhabditis elegans (Maupas, 1900)"
              }
            },
            {
              "pk": 15,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "",
                "type": "synonym",
                "name": "Rhabditis elegans"
              }
            },
            {
              "pk": 16,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "",
                "type": "authority",
                "name": "Rhabditis elegans Maupas, 1900"
              }
            },
            {
              "pk": 17,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 6239,
                "unique_name": "nematode <Caenorhabditis elegans>",
                "type": "common name",
                "name": "nematode"
              }
            },
            {
              "pk": 18,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7227,
                "unique_name": "",
                "type": "misspelling",
                "name": "Drosophila melangaster"
              }
            },
            {
              "pk": 19,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7227,
                "unique_name": "",
                "type": "scientific name",
                "name": "Drosophila melanogaster"
              }
            },
            {
              "pk": 20,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7227,
                "unique_name": "Drosophila melanogaster",
                "type": "abbreviation",
                "name": "D. melanogaster"
              }
            },
            {
              "pk": 21,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7227,
                "unique_name": "",
                "type": "authority",
                "name": "Drosophila melanogaster Meigen, 1830"
              }
            },
            {
              "pk": 22,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7227,
                "unique_name": "",
                "type": "genbank common name",
                "name": "fruit fly"
              }
            },
            {
              "pk": 23,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 9606,
                "unique_name": "",
                "type": "scientific name",
                "name": "Homo sapiens"
              }
            },
            {
              "pk": 24,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 9606,
                "unique_name": "Homo sapiens",
                "type": "abbreviation",
                "name": "H. sapiens"
              }
            },
            {
              "pk": 25,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 9606,
                "unique_name": "",
                "type": "authority",
                "name": "Homo sapiens Linnaeus, 1758"
              }
            },
            {
              "pk": 26,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 9606,
                "unique_name": "",
                "type": "genbank common name",
                "name": "human"
              }
            },
            {
              "pk": 27,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 9606,
                "unique_name": "",
                "type": "common name",
                "name": "man"
              }
            },
            {
              "pk": 28,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 4896,
                "unique_name": "",
                "type": "common name",
                "name": "fission yeast"
              }
            },
            {
              "pk": 29,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 4896,
                "unique_name": "",
                "type": "scientifc name",
                "name": "Schizosaccharomyces pombe"
              }
            },
            {
              "pk": 30,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 4896,
                "unique_name": "Schizosaccharomyces pombe",
                "type": "abbreviation name",
                "name": "S. pombe"
              }
            },
            {
              "pk": 31,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "scientific name",
                "name": "Danio rerio"
              }
            },
            {
              "pk": 32,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "Danio rerio",
                "type": "abbreviation",
                "name": "D. rerio"
              }
            },
            {
              "pk": 33,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "zebra fish <Danio rerio>",
                "type": "common name",
                "name": "zebra fish"
              }
            },
            {
              "pk": 34,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "misspelling",
                "name": "Brachidanio rerio"
              }
            },
            {
              "pk": 35,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Brachydanio rerio"
              }
            },
            {
              "pk": 36,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Brachydanio rerio frankei"
              }
            },
            {
              "pk": 37,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Cyprinus rerio"
              }
            },
            {
              "pk": 38,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Cyprinus rerio Hamilton, 1822"
              }
            },
            {
              "pk": 39,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Danio frankei"
              }
            },
            {
              "pk": 40,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Danio rerio (Hamilton, 1822)"
              }
            },
            {
              "pk": 41,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "synonym",
                "name": "Danio rerio frankei"
              }
            },
            {
              "pk": 42,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "common name",
                "name": "leopard danio"
              }
            },
            {
              "pk": 43,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "common name",
                "name": "zebra danio"
              }
            },
            {
              "pk": 44,
              "model": "annotation_server.taxon",
              "fields": {
                "taxon_id": 7955,
                "unique_name": "",
                "type": "genbank common name",
                "name": "zebrafish"
              }
            },
            {
              "pk": 1,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "GRCh37 Genome Reference Consortium Human Reference 37 (GCA_000001405.1)",
                "name": "hg19",
                "default_build": True,
                "html_path": "/gbdb/hg19/html/description.html",
                "affiliation": "UCSC",
                "species": 23,
                "description": "Feb. 2009 (GRCh37/hg19)"
              }
            },
            {
              "pk": 2,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 1,
                "source_name": None,
                "name": "Genome Reference Consortium GRCh37",
                "default_build": False,
                "html_path": None,
                "affiliation": "Genome Reference Consortium",
                "species": 23,
                "description": "Feb. 2009"
              }
            },
            {
              "pk": 3,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "NCBI Build 36.1",
                "name": "hg18",
                "default_build": False,
                "html_path": "/gbdb/hg18/html/description.html",
                "affiliation": "UCSC",
                "species": 23,
                "description": "Mar. 2006 (NCBI36/hg18)"
              }
            },
            {
              "pk": 4,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 3,
                "source_name": None,
                "name": "NCBI Build 36.1",
                "default_build": False,
                "html_path": None,
                "affiliation": "NCBI",
                "species": 23,
                "description": "Mar. 2006"
              }
            },
            {
              "pk": 5,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "NCBI Build 36",
                "name": "mm8",
                "default_build": False,
                "html_path": "/gbdb/mm8/html/description.html",
                "affiliation": "UCSC",
                "species": 3,
                "description": "Feb. 2006 (NCBI36/mm8)"
              }
            },
            {
              "pk": 6,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 5,
                "source_name": None,
                "name": "NCBI Build 36",
                "default_build": False,
                "html_path": None,
                "affiliation": "NCBI",
                "species": 3,
                "description": "Feb. 2006"
              }
            },
            {
              "pk": 7,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "NCBI Build 37",
                "name": "mm9",
                "default_build": True,
                "html_path": "/gbdb/mm9/html/description.html",
                "affiliation": "UCSC",
                "species": 3,
                "description": "July 2007 (NCBI37/mm9)"
              }
            },
            {
              "pk": 8,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 7,
                "source_name": None,
                "name": "NCBI Build 37",
                "default_build": False,
                "html_path": None,
                "affiliation": "NCBI",
                "species": 3,
                "description": "Jul. 2007"
              }
            },
            {
              "pk": 9,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "Genome Reference Consortium Mouse Build 38 (GCA_000001635.2)",
                "name": "mm10",
                "default_build": False,
                "html_path": "/gbdb/mm10/html/description.html",
                "affiliation": "UCSC",
                "species": 3,
                "description": "Dec. 2011 (GRCm38/mm10)"
              }
            },
            {
              "pk": 10,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 9,
                "source_name": None,
                "name": "Genome Reference Consortium GRCm38",
                "default_build": False,
                "html_path": None,
                "affiliation": "Genome Reference Consortium",
                "species": 3,
                "description": "Dec. 2011"
              }
            },
            {
              "pk": 11,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "BDGP Release 5",
                "name": "dm3",
                "default_build": True,
                "html_path": "/gbdb/dm3/html/description.html",
                "affiliation": "UCSC",
                "species": 19,
                "description": "Apr. 2006 (BDGP R5/dm3)"
              }
            },
            {
              "pk": 12,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 11,
                "source_name": None,
                "name": "BDGP Release 5",
                "default_build": False,
                "html_path": None,
                "affiliation": "BDGP",
                "species": 19,
                "description": "Apr. 2006"
              }
            },
            {
              "pk": 13,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "BDGP v. 4 / DHGP v. 3.2",
                "name": "dm2",
                "default_build": False,
                "html_path": "/gbdb/dm2/html/description.html",
                "affiliation": "UCSC",
                "species": 19,
                "description": "Apr. 2004 (BDGP R4/dm2)"
              }
            },
            {
              "pk": 14,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 13,
                "source_name": None,
                "name": "BDGP Release 4",
                "default_build": False,
                "html_path": None,
                "affiliation": "BDGP",
                "species": 19,
                "description": "Apr. 2004"
              }
            },
            {
              "pk": 15,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "BDGP v. 3",
                "name": "dm1",
                "default_build": False,
                "html_path": "/gbdb/dm1/html/description.html",
                "affiliation": "UCSC",
                "species": 19,
                "description": "Jan. 2003 (BDGP R3/dm1)"
              }
            },
            {
              "pk": 16,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 15,
                "source_name": None,
                "name": "BDGP Release 3",
                "default_build": False,
                "html_path": None,
                "affiliation": "BDGP",
                "species": 19,
                "description": "Jan. 2003"
              }
            },
            {
              "pk": 17,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "Washington University School of Medicine GSC and Sanger Institute WS220",
                "name": "ce10",
                "default_build": False,
                "html_path": "/gbdb/ce10/html/description.html",
                "affiliation": "UCSC",
                "species": 12,
                "description": "Oct. 2010 (WS220/ce10)"
              }
            },
            {
              "pk": 18,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 17,
                "source_name": None,
                "name": "WormBase v. WS220",
                "default_build": False,
                "html_path": None,
                "affiliation": "WormBase",
                "species": 12,
                "description": "Oct. 2010"
              }
            },
            {
              "pk": 19,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": "Washington University School of Medicine GSC and Sanger Institute WS190",
                "name": "ce6",
                "default_build": True,
                "html_path": "/gbdb/ce6/html/description.html",
                "affiliation": "UCSC",
                "species": 12,
                "description": "May 2008 (WS190/ce6)"
              }
            },
            {
              "pk": 20,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 19,
                "source_name": None,
                "name": "WormBase v. WS190",
                "default_build": False,
                "html_path": None,
                "affiliation": "WormBase",
                "species": 12,
                "description": "May 2008"
              }
            },
            {
              "pk": 21,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": None,
                "source_name": None,
                "name": "spombe_1.55",
                "default_build": True,
                "html_path": None,
                "affiliation": "",
                "species": 29,
                "description": "Added manually by Nils Gehlenborg on 15 March 2013."
              }
            },
            {
              "pk": 22,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": False,
                "ucsc_equivalent": None,
                "source_name": "Sanger Institute",
                "name": "danRer7",
                "default_build": True,
                "html_path": "",
                "affiliation": "UCSC",
                "species": 31,
                "description": "Jul. 2010 (Zv9/danRer7)"
              }
            },
            {
              "pk": 23,
              "model": "annotation_server.genomebuild",
              "fields": {
                "available": True,
                "ucsc_equivalent": 22,
                "source_name": "",
                "name": "Zv9",
                "default_build": False,
                "html_path": "",
                "affiliation": "Sanger Institute",
                "species": 31,
                "description": "Jul. 2010"
              }
            }]

    data_as_json = json.dumps([ob for ob in data])
    objects = serializers.deserialize('json', data_as_json, ignorenonexistent=True)
    for obj in objects:
        obj.save()


def backwards(apps, schema_editor):
    "Brutally deleting all entries for this model..."
    GenomeBuild = apps.get_model("annotation_server", "GenomeBuild")
    GenomeBuild.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ce10_WormBase',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('source', models.CharField(max_length=100)),
                ('feature', models.CharField(max_length=100)),
                ('start', models.IntegerField(db_index=True)),
                ('end', models.IntegerField(db_index=True)),
                ('score', models.CharField(max_length=100)),
                ('strand', models.CharField(max_length=1)),
                ('frame', models.CharField(max_length=100)),
                ('attribute', models.TextField()),
                ('cds', models.CharField(max_length=100)),
                ('clone', models.CharField(max_length=100)),
                ('gene', models.CharField(max_length=100)),
            ],
            options={
                'ordering': ['chrom', 'start'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ChromInfo',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('size', models.IntegerField()),
                ('fileName', models.CharField(max_length=255)),
            ],
            options={
                'ordering': ['-size'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ConservationTrack',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('position', models.IntegerField(db_index=True)),
                ('value', models.FloatField()),
            ],
            options={
                'ordering': ['chrom', 'position'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='CytoBand',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255)),
                ('chromStart', models.IntegerField(db_index=True)),
                ('chromEnd', models.IntegerField(db_index=True)),
                ('name', models.CharField(max_length=255, db_index=True)),
                ('gieStain', models.CharField(max_length=255)),
            ],
            options={
                'ordering': ['chrom', 'chromStart'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='dm3_FlyBase',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('source', models.CharField(max_length=100)),
                ('feature', models.CharField(max_length=100)),
                ('start', models.IntegerField(db_index=True)),
                ('end', models.IntegerField(db_index=True)),
                ('score', models.CharField(max_length=100)),
                ('strand', models.CharField(max_length=1)),
                ('frame', models.CharField(max_length=100)),
                ('attribute', models.TextField()),
                ('name', models.CharField(max_length=100)),
                ('Alias', models.TextField()),
                ('description', models.CharField(max_length=255)),
                ('fullname', models.CharField(max_length=100)),
                ('symbol', models.CharField(max_length=100)),
            ],
            options={
                'ordering': ['chrom', 'start'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='EmpiricalMappability',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('chromStart', models.IntegerField(db_index=True)),
                ('chromEnd', models.IntegerField(db_index=True)),
                ('name', models.CharField(max_length=255)),
                ('score', models.CharField(max_length=255)),
                ('strand', models.CharField(max_length=1)),
                ('thickStart', models.IntegerField(null=True)),
                ('thickEnd', models.IntegerField(null=True)),
                ('itemRgb', models.CharField(max_length=255)),
                ('blockCount', models.IntegerField(null=True)),
                ('blockSizes', models.CommaSeparatedIntegerField(max_length=3700)),
                ('blockStarts', models.CommaSeparatedIntegerField(max_length=3700)),
            ],
            options={
                'ordering': ['chrom', 'chromStart'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='GapRegionFile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('bin', models.IntegerField()),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('chromStart', models.IntegerField(db_index=True)),
                ('chromEnd', models.IntegerField(db_index=True)),
                ('ix', models.IntegerField(db_index=True)),
                ('n', models.CharField(max_length=255)),
                ('size', models.IntegerField(db_index=True)),
                ('type', models.CharField(max_length=255)),
                ('bridge', models.CharField(max_length=255)),
            ],
            options={
                'ordering': ['chrom', 'chromStart'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='GCContent',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('position', models.IntegerField(db_index=True)),
                ('value', models.FloatField()),
            ],
            options={
                'ordering': ['chrom', 'position'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Gene',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('bin', models.IntegerField()),
                ('name', models.CharField(max_length=255, db_index=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('strand', models.CharField(max_length=1)),
                ('txStart', models.IntegerField(db_index=True)),
                ('txEnd', models.IntegerField(db_index=True)),
                ('cdsStart', models.IntegerField(db_index=True)),
                ('cdsEnd', models.IntegerField(db_index=True)),
                ('exonCount', models.IntegerField()),
                ('exonStarts', models.CommaSeparatedIntegerField(max_length=3700, db_index=True)),
                ('exonEnds', models.CommaSeparatedIntegerField(max_length=3700, db_index=True)),
                ('score', models.IntegerField()),
                ('name2', models.CharField(max_length=255, db_index=True)),
                ('cdsStartStat', models.CharField(max_length=10, db_index=True)),
                ('cdsEndStat', models.CharField(max_length=10, db_index=True)),
                ('exonFrames', models.CommaSeparatedIntegerField(max_length=3700)),
            ],
            options={
                'ordering': ['chrom', 'txStart'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='GenomeBuild',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=255)),
                ('affiliation', models.CharField(default=b'UCSC', max_length=255)),
                ('description', models.CharField(max_length=255)),
                ('html_path', models.CharField(max_length=1024, null=True, blank=True)),
                ('source_name', models.CharField(max_length=1024, null=True, blank=True)),
                ('available', models.BooleanField(default=True)),
                ('default_build', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='hg19_GenCode',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('source', models.CharField(max_length=100)),
                ('feature', models.CharField(max_length=100)),
                ('start', models.IntegerField(db_index=True)),
                ('end', models.IntegerField(db_index=True)),
                ('score', models.CharField(max_length=100)),
                ('strand', models.CharField(max_length=1)),
                ('frame', models.CharField(max_length=100)),
                ('attribute', models.TextField()),
                ('gene_id', models.CharField(max_length=255, db_index=True)),
                ('transcript_id', models.CharField(max_length=255, db_index=True)),
                ('gene_type', models.CharField(max_length=100, db_index=True)),
                ('gene_status', models.CharField(max_length=100, db_index=True)),
                ('gene_name', models.CharField(max_length=100, db_index=True)),
                ('transcript_type', models.CharField(max_length=100, db_index=True)),
                ('transcript_status', models.CharField(max_length=100, db_index=True)),
                ('transcript_name', models.CharField(max_length=100, db_index=True)),
                ('genomebuild', models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True)),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Taxon',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('taxon_id', models.IntegerField(db_index=True)),
                ('name', models.CharField(max_length=1024)),
                ('unique_name', models.CharField(max_length=1024, null=True, blank=True)),
                ('type', models.CharField(max_length=255, db_index=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TheoreticalMappability',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('chrom', models.CharField(max_length=255, db_index=True)),
                ('chromStart', models.IntegerField(db_index=True)),
                ('chromEnd', models.IntegerField(db_index=True)),
                ('name', models.CharField(max_length=255)),
                ('score', models.CharField(max_length=255)),
                ('strand', models.CharField(max_length=1)),
                ('thickStart', models.IntegerField(null=True)),
                ('thickEnd', models.IntegerField(null=True)),
                ('itemRgb', models.CharField(max_length=255)),
                ('blockCount', models.IntegerField(null=True)),
                ('blockSizes', models.CommaSeparatedIntegerField(max_length=3700)),
                ('blockStarts', models.CommaSeparatedIntegerField(max_length=3700)),
                ('genomebuild', models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True)),
            ],
            options={
                'ordering': ['chrom', 'chromStart'],
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WigDescription',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('annotation_type', models.CharField(max_length=255)),
                ('name', models.CharField(max_length=1024)),
                ('altColor', models.CharField(max_length=255)),
                ('color', models.CharField(max_length=255)),
                ('visibility', models.CharField(max_length=255)),
                ('priority', models.IntegerField()),
                ('type', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('genomebuild', models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterUniqueTogether(
            name='taxon',
            unique_together=set([('taxon_id', 'name')]),
        ),
        migrations.AddField(
            model_name='genomebuild',
            name='species',
            field=models.ForeignKey(to='annotation_server.Taxon'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='genomebuild',
            name='ucsc_equivalent',
            field=models.ForeignKey(blank=True, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='gene',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='gccontent',
            name='annot',
            field=models.ForeignKey(to='annotation_server.WigDescription'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='gccontent',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='gapregionfile',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='empiricalmappability',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='dm3_flybase',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='cytoband',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='conservationtrack',
            name='annot',
            field=models.ForeignKey(to='annotation_server.WigDescription'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='conservationtrack',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='chrominfo',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='ce10_wormbase',
            name='genomebuild',
            field=models.ForeignKey(default=None, to='annotation_server.GenomeBuild', null=True),
            preserve_default=True,
        ),
        migrations.RunPython(forwards, backwards),
    ]
