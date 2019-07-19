# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0028_tooldefinition_mem_reservation_mb'),
    ]

    operations = [
        migrations.AddField(
            model_name='parameter',
            name='temp_uuid',
            field=models.UUIDField(null=True),
        ),
        # allow backward migrations and remove dependency on django_extensions
        migrations.AlterField(
            model_name='parameter',
            name='uuid',
            field=models.CharField(max_length=36, null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE tool_manager_parameter SET temp_uuid = CAST (uuid AS uuid)",
            "UPDATE tool_manager_parameter SET uuid = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='parameter',
            name='uuid',
        ),
        migrations.RenameField(
            model_name='parameter',
            old_name='temp_uuid',
            new_name='uuid',
        ),
        migrations.AlterField(
            model_name='parameter',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
