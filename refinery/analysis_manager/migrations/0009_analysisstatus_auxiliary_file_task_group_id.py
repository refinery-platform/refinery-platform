# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0008_analysisstatus_galaxy_workflow_task_group_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='auxiliary_file_task_group_id',
            field=models.UUIDField(null=True, editable=False),
        ),
    ]
