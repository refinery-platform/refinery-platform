# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_auto_20171026_0908'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='nodeset',
            name='assay',
        ),
        migrations.RemoveField(
            model_name='nodeset',
            name='study',
        ),
        migrations.DeleteModel(
            name='NodeSet',
        ),
    ]
