# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0035_remove_userprofile_uuid'),
    ]

    operations = [
        migrations.RenameField(
            model_name='userprofile',
            old_name='temp_uuid',
            new_name='uuid',
        ),
    ]
