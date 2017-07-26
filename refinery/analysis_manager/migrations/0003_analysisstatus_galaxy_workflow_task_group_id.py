# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0002_analysisstatus_galaxy_import_progress'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='galaxy_workflow_task_group_id',
            field=django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True),
            preserve_default=True,
        ),
    ]
