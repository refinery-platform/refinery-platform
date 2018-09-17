# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0011_auto_20170419_1445'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='tool',
            options={'verbose_name': 'tool', 'permissions': (('read_tool', 'Can read tool'),)},
        ),
    ]
