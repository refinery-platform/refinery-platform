# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_auto_20170824_1339'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisnodeconnection',
            name='galaxy_dataset_name',
            field=models.CharField(max_length=250, null=True, blank=True),
            preserve_default=True,
        ),
    ]
