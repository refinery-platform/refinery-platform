# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import uuid

from django.db import migrations, models
from django.db.models import F


def copy_field(apps, schema_editor):
    UserProfile = apps.get_model('core', 'UserProfile')
    UserProfile.objects.all().update(uuid=F('temp_uuid'))


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0034_copy_userprofile_uuid'),
    ]

    operations = [
        # migrations.RunPython(migrations.RunPython.noop, copy_field),
        migrations.RemoveField(
            model_name='userprofile',
            name='uuid',
        ),
    ]
