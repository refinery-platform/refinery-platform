# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0012_auto_20170419_1451'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tool',
            name='container_name',
            field=models.CharField(max_length=250, unique=True, null=True, blank=True),
            preserve_default=True,
        ),
    ]
