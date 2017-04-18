# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import datetime
import django_extensions.db.fields


class Migration(migrations.Migration):

    replaces = [(b'tool_manager', '0001_initial'), (b'tool_manager', '0002_auto_20170321_1628'), (b'tool_manager', '0003_auto_20170322_1207'), (b'tool_manager', '0004_visualizationcontainer'), (b'tool_manager', '0005_auto_20170412_1626'), (b'tool_manager', '0006_auto_20170417_1357'), (b'tool_manager', '0007_auto_20170417_1409'), (b'tool_manager', '0008_visualizationdefinition_container_input_path'), (b'tool_manager', '0009_auto_20170417_1514'), (b'tool_manager', '0010_auto_20170417_1514'), (b'tool_manager', '0011_workflowdefinition'), (b'tool_manager', '0012_auto_20170417_1537'), (b'tool_manager', '0013_auto_20170417_1542'), (b'tool_manager', '0014_auto_20170417_1549'), (b'tool_manager', '0015_remove_toollaunch_start_date'), (b'tool_manager', '0016_auto_20170417_1613'), (b'tool_manager', '0017_auto_20170417_1616'), (b'tool_manager', '0018_auto_20170417_1628'), (b'tool_manager', '0019_auto_20170417_1629'), (b'tool_manager', '0020_auto_20170417_1631'), (b'tool_manager', '0021_auto_20170417_1633')]

    dependencies = [
        ('core', '0005_ontology_data'),
        ('file_store', '0002_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.CreateModel(
            name='FileRelationship',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(max_length=100)),
                ('value_type', models.CharField(max_length=100, choices=[(b'PAIR', b'pair'), (b'LIST', b'list')])),
                ('file_relationship', models.ManyToManyField(to=b'tool_manager.FileRelationship', null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='InputFile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(max_length=100)),
                ('description', models.TextField(max_length=500)),
                ('allowed_filetypes', models.ManyToManyField(to=b'file_store.FileType')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='OutputFile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(max_length=100)),
                ('description', models.TextField(max_length=500)),
                ('filetype', models.ForeignKey(to='file_store.FileType')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Parameter',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(max_length=100)),
                ('description', models.TextField(max_length=500)),
                ('is_user_adjustable', models.BooleanField(default=False)),
                ('value_type', models.CharField(max_length=25, choices=[(b'INTEGER', b'int'), (b'STRING', b'str'), (b'BOOLEAN', b'bool'), (b'FLOAT', b'float'), (b'GENOME_BUILD', b'genome build'), (b'ATTRIBUTE', b'attribute'), (b'FILE', b'file')])),
                ('default_value', models.TextField(max_length=100)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='GalaxyParameter',
            fields=[
                ('parameter_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.Parameter')),
                ('galaxy_workflow_step', models.IntegerField()),
            ],
            options={
            },
            bases=('tool_manager.parameter',),
        ),
        migrations.CreateModel(
            name='ToolDefinition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(unique=True, max_length=100)),
                ('description', models.TextField(max_length=500)),
                ('tool_type', models.CharField(max_length=100, choices=[(b'WORKFLOW', b'Workflow'), (b'VISUALIZATION', b'Visualization')])),
                ('file_relationship', models.ForeignKey(to='tool_manager.FileRelationship')),
                ('output_files', models.ManyToManyField(to=b'tool_manager.OutputFile')),
                ('parameters', models.ManyToManyField(to=b'tool_manager.Parameter')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='filerelationship',
            name='input_files',
            field=models.ManyToManyField(to=b'tool_manager.InputFile'),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='parameter',
            name='is_user_adjustable',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
        migrations.CreateModel(
            name='VisualizationDefinition',
            fields=[
                ('tooldefinition_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.ToolDefinition')),
                ('docker_image_name', models.CharField(max_length=255)),
                ('container_name', models.CharField(max_length=150)),
                ('container_input_path', models.CharField(max_length=500, null=True, blank=True)),
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
                ('analysis', models.OneToOneField(parent_link=True, default=1, to='core.Analysis')),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'ownableresource'},
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='creation_date',
            field=models.DateTimeField(default=datetime.datetime(2017, 4, 17, 13, 56, 46, 629590), auto_now_add=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='description',
            field=models.TextField(max_length=5000, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='modification_date',
            field=models.DateTimeField(default=datetime.datetime(2017, 4, 17, 13, 57, 4, 7727), auto_now=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='name',
            field=models.CharField(max_length=250, null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='slug',
            field=models.CharField(max_length=250, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='summary',
            field=models.CharField(max_length=1000, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='uuid',
            field=django_extensions.db.fields.UUIDField(default=None, unique=True, max_length=36, editable=False, blank=True),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name='ToolLaunch',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('file_relationships', models.TextField()),
                ('parameters', models.TextField()),
                ('tool_definition', models.ForeignKey(to='tool_manager.ToolDefinition')),
            ],
            options={
            },
            bases=(models.Model,),
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
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='toollaunch_ptr',
            field=models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, default=1, serialize=False, to='tool_manager.ToolLaunch'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='workflowtoollaunch',
            name='toollaunch_ptr',
            field=models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, default=1, serialize=False, to='tool_manager.ToolLaunch'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='workflowtoollaunch',
            name='analysis',
            field=models.ForeignKey(to='core.Analysis'),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='workflowtoollaunch',
            name='analysis',
            field=models.OneToOneField(to='core.Analysis'),
            preserve_default=True,
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
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'Visualization Tool Launches', 'permissions': (('read_Visualization Tool Launches', 'Can read Visualization Tool Launches'),)},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'Visualization Tool Launch'},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'VisualizationToolLaunch'},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualization tool launch'},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'ownableresource'},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualizationtoollaunch', 'permissions': ('read_visualizationtoollaunch', 'Can read visualizationtoollaunch')},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualization tool launch', 'permissions': ('read_visualization tool launch', 'Can read visualization tool launch')},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualization tool launch', 'permissions': (('read_visualization tool launch', 'Can read visualization tool launch'),)},
        ),
        migrations.AlterModelOptions(
            name='visualizationtoollaunch',
            options={'verbose_name': 'visualizationtoollaunch', 'permissions': (('read_visualizationtoollaunch', 'Can read visualizationtoollaunch'),)},
        ),
    ]
