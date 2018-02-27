# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import django.core.files.storage
from django.db import migrations, models

import chunked_upload.models


class Migration(migrations.Migration):

    dependencies = [
        ('chunked_upload', '0002_auto_20180207_0800'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chunkedupload',
            name='file',
            field=models.FileField(
                storage=django.core.files.storage.FileSystemStorage(),
                max_length=255,
                upload_to=chunked_upload.models.generate_filename
            ),
        ),
    ]
