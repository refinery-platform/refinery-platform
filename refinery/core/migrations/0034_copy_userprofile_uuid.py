# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models

import django_extensions


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0033_userprofile_temp_uuid'),
    ]

    operations = [
        migrations.RunSQL(
            "UPDATE core_userprofile SET temp_uuid = CAST (uuid AS uuid)",
            migrations.RunSQL.noop
        ),
        # to allow backward migrations after removing this field
        migrations.AlterField(
            model_name='userprofile',
            name='uuid',
            field=django_extensions.db.fields.UUIDField(null=True),
        ),
        migrations.RunSQL(
            migrations.RunSQL.noop,
            "UPDATE core_userprofile SET uuid = temp_uuid"
        )
    ]
