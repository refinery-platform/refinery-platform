# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0003_analysisstatus_galaxy_workflow_task_group_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='galaxy_import_state',
            field=models.CharField(blank=True, max_length=10, choices=[(b'SUCCESS', b'OK'), (b'FAILURE', b'Error'), (b'PROGRESS', b'Running'), (b'PENDING', b'Unknown')]),
            preserve_default=True,
        ),
    ]
