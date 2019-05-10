# -*- coding: utf-8 -*-
from __future__ import unicode_literals

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
    ]
