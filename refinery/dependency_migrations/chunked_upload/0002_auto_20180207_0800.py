# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chunked_upload', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='chunkedupload',
            name='status',
            field=models.PositiveSmallIntegerField(
                default=1, choices=[(1, 'Uploading'), (2, 'Complete')]
            ),
        ),
    ]
