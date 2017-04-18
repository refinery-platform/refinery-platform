# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0007_auto_20170418_1233'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='toollaunch',
            options={'verbose_name': 'toollaunch', 'permissions': (('read_toollaunch', 'Can read toollaunch'),)},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualization tool launch'},
        ),
        migrations.AlterModelOptions(
            name='workflowtoollaunch',
            options={'verbose_name': 'workflow tool launch'},
        ),
    ]
