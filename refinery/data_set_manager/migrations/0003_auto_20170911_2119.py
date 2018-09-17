# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0002_auto_20170605_1816'),
    ]

    operations = [
        migrations.AlterField(
            model_name='node',
            name='workflow_output',
            field=models.CharField(max_length=500, null=True),
            preserve_default=True,
        ),
    ]
