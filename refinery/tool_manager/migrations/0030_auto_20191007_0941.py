# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0029_parameter_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflowtool',
            name='exposed_dataset_list',
            field=models.TextField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='workflowtool',
            name='full_history_list',
            field=models.TextField(null=True, blank=True),
        ),
    ]
