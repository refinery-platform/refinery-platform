# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.core.management import call_command

class Migration(migrations.Migration):

    def load_fixture(apps, schema_editor):
        call_command('loaddata', 'annotation_data', app_label='annotation_server')

    def unload_fixture(apps, schema_editor):
        "Brutally deleting all entries for this model..."

        taxon = apps.get_model("annotation_server", "Taxon")
        taxon.objects.all().delete()

        genomebuild = apps.get_model("annotation_server", "GenomeBuild")
        genomebuild.objects.all().delete()

    dependencies = [
        ('annotation_server', '0001_initial'),
        ('contenttypes', '__latest__'),
        ('sites', '__latest__'),
    ]

    operations = [
        migrations.RunPython(load_fixture, reverse_code=unload_fixture),
    ]