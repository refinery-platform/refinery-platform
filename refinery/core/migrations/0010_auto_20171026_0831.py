# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_analysisnodeconnection_galaxy_dataset_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='noderelationship',
            name='assay',
        ),
        migrations.RemoveField(
            model_name='noderelationship',
            name='node_pairs',
        ),
        migrations.RemoveField(
            model_name='noderelationship',
            name='node_set_1',
        ),
        migrations.RemoveField(
            model_name='noderelationship',
            name='node_set_2',
        ),
        migrations.RemoveField(
            model_name='noderelationship',
            name='study',
        ),
        migrations.DeleteModel(
            name='NodeRelationship',
        ),
    ]
