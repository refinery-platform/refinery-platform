# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0037_remove_analysisresult_analysis_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisnodeconnection',
            name='dataset_id',
            field=models.CharField(max_length=100, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='analysisnodeconnection',
            name='file_size',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='analysisnodeconnection',
            name='state',
            field=models.CharField(max_length=100, null=True, blank=True),
        ),
    ]
