# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0030_update_userprofile_primary_group'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tutorials',
            name='launchpad_tutorial_viewed',
        ),
    ]
