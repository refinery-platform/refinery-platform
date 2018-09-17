# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_delete_diskquota'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='analysis',
            name='workflow_data_input_maps',
        ),
        migrations.RemoveField(
            model_name='workflow',
            name='data_inputs',
        ),
        migrations.RemoveField(
            model_name='workflow',
            name='input_relationships',
        ),
        migrations.DeleteModel(
            name='WorkflowDataInput',
        ),
        migrations.DeleteModel(
            name='WorkflowDataInputMap',
        ),
        migrations.DeleteModel(
            name='WorkflowInputRelationships',
        ),
    ]
