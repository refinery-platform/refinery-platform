# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import datetime
from django.utils.timezone import utc
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_ontology_data'),
        ('tool_manager', '0005_auto_20170412_1626'),
    ]

    operations = [
        migrations.CreateModel(
            name='ToolLaunch',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('file_relationships', models.TextField()),
                ('parameters', models.TextField()),
                ('start_date', models.DateField(default=datetime.datetime(2017, 4, 18, 16, 33, 33, 336000, tzinfo=utc))),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='WorkflowDefinition',
            fields=[
                ('tooldefinition_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.ToolDefinition')),
                ('galaxy_workflow_id', models.CharField(max_length=250)),
            ],
            options={
                'verbose_name': 'Workflow Definition',
            },
            bases=('tool_manager.tooldefinition',),
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='tool_definition',
            field=models.ForeignKey(to='tool_manager.ToolDefinition'),
            preserve_default=True,
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualizationtoollaunch', 'permissions': (('read_visualizationtoollaunch', 'Can read visualizationtoollaunch'),)},
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='file_relationships',
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='id',
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='parameters',
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='start_date',
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='tool_definition',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='file_relationships',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='id',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='parameters',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='start_date',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='tool_definition',
        ),
        migrations.AddField(
            model_name='visualizationdefinition',
            name='container_input_path',
            field=models.CharField(max_length=500, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='toollaunch_ptr',
            field=models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, default=1, serialize=False, to='tool_manager.ToolLaunch'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workflowtoollaunch',
            name='analysis',
            field=models.OneToOneField(default=1, to='core.Analysis'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workflowtoollaunch',
            name='toollaunch_ptr',
            field=models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, default=1, serialize=False, to='tool_manager.ToolLaunch'),
            preserve_default=False,
        ),
    ]
