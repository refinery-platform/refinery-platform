# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0009_xls_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.AddField(
            model_name='filestoreitem',
            name='temp_uuid',
            field=models.UUIDField(null=True),
        ),
        # allow backward migrations and remove dependency on django_extensions
        migrations.AlterField(
            model_name='filestoreitem',
            name='uuid',
            field=models.CharField(max_length=36, null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE file_store_filestoreitem SET temp_uuid = CAST (uuid AS uuid)",
            "UPDATE file_store_filestoreitem SET uuid = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='filestoreitem',
            name='uuid',
        ),
        migrations.RenameField(
            model_name='filestoreitem',
            old_name='temp_uuid',
            new_name='uuid',
        ),
        migrations.AlterField(
            model_name='filestoreitem',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
