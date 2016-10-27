# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_auto_20161027_1416'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='download',
            name='expiration',
        ),
        migrations.RemoveField(
            model_name='nodegroup',
            name='expiration',
        ),
        migrations.RemoveField(
            model_name='nodeset',
            name='expiration',
        ),
    ]
