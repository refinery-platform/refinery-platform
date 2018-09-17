# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0024_auto_20170828_1741'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filerelationship',
            name='file_relationship',
            field=models.ManyToManyField(
                to='tool_manager.FileRelationship',
                blank=True
            ),
        ),
    ]
