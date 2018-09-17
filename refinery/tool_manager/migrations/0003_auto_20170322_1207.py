# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0002_auto_20170321_1628'),
    ]

    operations = [
        migrations.AlterField(
            model_name='parameter',
            name='is_user_adjustable',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
    ]
