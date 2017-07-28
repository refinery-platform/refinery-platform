# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0022_auto_20170626_1556'),
    ]

    operations = [
        migrations.CreateModel(
            name='VisualizationTool',
            fields=[
                ('tool_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.Tool')),
            ],
            options={
                'abstract': False,
                'verbose_name': 'ownableresource',
            },
            bases=('tool_manager.tool',),
        ),
        migrations.CreateModel(
            name='WorkflowTool',
            fields=[
                ('tool_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.Tool')),
            ],
            options={
                'abstract': False,
                'verbose_name': 'ownableresource',
            },
            bases=('tool_manager.tool',),
        ),
    ]
