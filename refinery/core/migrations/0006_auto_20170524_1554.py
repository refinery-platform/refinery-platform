# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_ontology_data'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='nodegroup',
            unique_together=None,
        ),
        migrations.RemoveField(
            model_name='nodegroup',
            name='assay',
        ),
        migrations.RemoveField(
            model_name='nodegroup',
            name='nodes',
        ),
        migrations.RemoveField(
            model_name='nodegroup',
            name='study',
        ),
        migrations.DeleteModel(
            name='NodeGroup',
        ),
    ]
