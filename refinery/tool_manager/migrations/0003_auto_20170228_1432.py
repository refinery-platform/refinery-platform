# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0002_auto_20170228_0912'),
    ]

    operations = [
        migrations.CreateModel(
            name='GalaxyToolParameter',
            fields=[
                ('parameter_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.Parameter')),
                ('galaxy_tool_id_temp', models.TextField(max_length=300)),
                ('galaxy_tool_parameter_temp', models.TextField(max_length=100)),
            ],
            options={
            },
            bases=('tool_manager.parameter',),
        ),
        migrations.RemoveField(
            model_name='parameter',
            name='galaxy_tool_id',
        ),
        migrations.RemoveField(
            model_name='parameter',
            name='galaxy_tool_parameter',
        ),
    ]
