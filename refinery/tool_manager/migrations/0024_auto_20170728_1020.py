# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0023_visualizationtool_workflowtool'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='visualizationtool',
            options={'verbose_name': 'visualizationtool', 'permissions': (('read_visualizationtool', 'Can read visualizationtool'),)},
        ),
        migrations.AlterModelOptions(
            name='workflowtool',
            options={'verbose_name': 'workflowtool', 'permissions': (('read_workflowtool', 'Can read workflowtool'),)},
        ),
    ]
