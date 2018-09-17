# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_auto_20171026_0831'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='nodepair',
            name='node1',
        ),
        migrations.RemoveField(
            model_name='nodepair',
            name='node2',
        ),
        migrations.DeleteModel(
            name='NodePair',
        ),
    ]
