# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields
import file_store.models


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0003_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filestoreitem',
            name='filetype',
            field=models.ForeignKey(blank=True, to='file_store.FileType', null=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='filestoreitem',
            name='uuid',
            field=django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='filestoreitem',
            name='datafile',
            field=models.FileField(max_length=1024, blank=True),
            preserve_default=True,
        ),
    ]
