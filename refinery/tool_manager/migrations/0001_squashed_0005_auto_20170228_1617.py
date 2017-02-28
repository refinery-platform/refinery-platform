# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    replaces = [(b'tool_manager', '0001_initial'), (b'tool_manager', '0002_auto_20170228_0912'), (b'tool_manager', '0003_auto_20170228_1432'), (b'tool_manager', '0004_auto_20170228_1433'), (b'tool_manager', '0005_auto_20170228_1617')]

    dependencies = [
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
                ('is_editable', models.BooleanField(default=False)),
                ('value_type', models.CharField(max_length=25, choices=[(b'INTEGER', b'int'), (b'STRING', b'str'), (b'BOOLEAN', b'bool'), (b'FLOAT', b'float'), (b'GENOME_BUILD', b'genome build'), (b'ATTRIBUTE', b'attribute'), (b'FILE', b'file')])),
                ('default_value', models.TextField(max_length=100)),
                ('galaxy_tool_id', models.TextField(max_length=300)),
                ('galaxy_tool_parameter', models.TextField(max_length=100)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='ToolDefinition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.TextField(unique=True, max_length=100)),
                ('description', models.TextField(unique=True, max_length=500)),
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
        migrations.AddField(
            model_name='filerelationship',
            name='file_relationship',
            field=models.ManyToManyField(to=b'tool_manager.FileRelationship', null=True, blank=True),
            preserve_default=True,
        ),
        migrations.CreateModel(
            name='GalaxyParameter',
            fields=[
                ('parameter_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='tool_manager.Parameter')),
                ('galaxy_tool_id', models.TextField(max_length=300)),
                ('galaxy_tool_parameter', models.TextField(max_length=100)),
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
