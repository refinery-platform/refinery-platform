# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models

import django_extensions


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0006_analysisstatus_galaxy_import_task_group_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='temp_uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        # to allow backward migrations after removing this field
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_export_task_group_id',
            field=django_extensions.db.fields.UUIDField(null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE analysis_manager_analysisstatus SET temp_uuid = CAST (galaxy_export_task_group_id AS uuid)",
            "UPDATE analysis_manager_analysisstatus SET galaxy_export_task_group_id = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='analysisstatus',
            name='galaxy_export_task_group_id',
        ),
        migrations.RenameField(
            model_name='analysisstatus',
            old_name='temp_uuid',
            new_name='galaxy_export_task_group_id',
        ),
    ]
