# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.core.management import call_command

class Migration(migrations.Migration):

    def load_fixture(apps, schema_editor):
        call_command('loaddata', 'file_store_data', app_label='file_store')

    def unload_fixture(apps, schema_editor):
        "Brutally deleting all entries for this model..."

        file_type = apps.get_model("file_store", "FileType")
        file_type.objects.all().delete()

        file_extension = apps.get_model("file_store", "FileExtension")
        file_extension.objects.all().delete()

    dependencies = [
        ('file_store', '0001_initial'),
        ('contenttypes', '__latest__'),
        ('sites', '__latest__'),
    ]

    operations = [
        migrations.RunPython(load_fixture, reverse_code=unload_fixture),
    ]
