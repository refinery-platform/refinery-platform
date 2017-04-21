# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0004_visualizationcontainer'),
    ]

    operations = [
        migrations.CreateModel(
            name='VisualizationDefinition',
            fields=[
                ('tooldefinition_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.ToolDefinition')),
                ('docker_image_name', models.CharField(max_length=255)),
                ('container_name', models.CharField(max_length=150)),
            ],
            options={
                'verbose_name': 'Visualization Definition',
            },
            bases=('tool_manager.tooldefinition',),
        ),
        migrations.CreateModel(
            name='VisualizationToolLaunch',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('file_relationships', models.TextField()),
                ('parameters', models.TextField()),
                ('start_date', models.DateTimeField(auto_now_add=True)),
                ('tool_definition', models.ForeignKey(to='tool_manager.ToolDefinition')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowToolLaunch',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('file_relationships', models.TextField()),
                ('parameters', models.TextField()),
                ('start_date', models.DateTimeField(auto_now_add=True)),
                ('tool_definition', models.ForeignKey(to='tool_manager.ToolDefinition')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.DeleteModel(
            name='VisualizationContainer',
        ),
    ]
