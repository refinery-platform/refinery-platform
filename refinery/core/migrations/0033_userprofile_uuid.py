# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_delete_ontology'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='temp_uuid',
            field=models.UUIDField(null=True),
        ),
        # allow backward migrations and remove dependency on django_extensions
        migrations.AlterField(
            model_name='userprofile',
            name='uuid',
            field=models.CharField(max_length=36, null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE core_userprofile SET temp_uuid = CAST (uuid AS uuid)",
            "UPDATE core_userprofile SET uuid = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='uuid',
        ),
        migrations.RenameField(
            model_name='userprofile',
            old_name='temp_uuid',
            new_name='uuid',
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
