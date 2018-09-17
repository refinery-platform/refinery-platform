# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0013_auto_20170419_1500'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tool',
            name='container_name',
            field=models.CharField(default='', unique=True, max_length=250, blank=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='tooldefinition',
            name='container_input_path',
            field=models.CharField(default='', max_length=500, blank=True),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='tooldefinition',
            name='galaxy_workflow_id',
            field=models.CharField(default='', max_length=250, blank=True),
            preserve_default=False,
        ),
    ]
