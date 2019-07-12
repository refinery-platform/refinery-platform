# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0004_auto_20171211_1145'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='temp_uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE analysis_manager_analysisstatus SET temp_uuid = CAST (refinery_import_task_group_id AS uuid)",
            "UPDATE analysis_manager_analysisstatus SET refinery_import_task_group_id = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='analysisstatus',
            name='refinery_import_task_group_id',
        ),
        migrations.RenameField(
            model_name='analysisstatus',
            old_name='temp_uuid',
            new_name='refinery_import_task_group_id',
        ),
    ]
