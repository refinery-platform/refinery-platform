# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0009_xls_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.AddField(
            model_name='filestoreitem',
            name='galaxy_dataset_history_id',
            field=models.CharField(max_length=1024, blank=True),
        ),
    ]
