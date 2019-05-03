# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0032_delete_ontology'),
    ]

    operations = [
        migrations.RunSQL(
            [
                'DROP INDEX core_userprofile_uuid_like',
                'ALTER TABLE core_userprofile ALTER COLUMN uuid TYPE uuid USING uuid::uuid',
            ],
            [
                'ALTER TABLE core_userprofile ALTER COLUMN uuid TYPE varchar(36)',
                'CREATE INDEX core_userprofile_uuid_like ON core_userprofile (uuid)',
            ]
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
