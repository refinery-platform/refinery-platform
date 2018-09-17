# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0019_tool_dataset'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tool',
            name='container_name',
            field=models.CharField(max_length=250, unique=True, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='tool',
            name='dataset',
            field=models.ForeignKey(blank=True, to='core.DataSet', null=True),
            preserve_default=True,
        ),
    ]
