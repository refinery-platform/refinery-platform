# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.core.validators
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_ontology_data'),
        ('tool_manager', '0010_auto_20170419_1443'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tool',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('name', models.CharField(max_length=250, null=True)),
                ('summary', models.CharField(max_length=1000, blank=True)),
                ('creation_date', models.DateTimeField(auto_now_add=True)),
                ('modification_date', models.DateTimeField(auto_now=True)),
                ('description', models.TextField(max_length=5000, blank=True)),
                ('slug', models.CharField(max_length=250, null=True, blank=True)),
                ('container_name', models.CharField(blank=True, max_length=250, unique=True, null=True, validators=[django.core.validators.RegexValidator(regex=b'^[a-zA-Z0-9][a-zA-Z0-9_.-]$', message=b'`container_name` must adhere to Docker specs. See here: http://bit.ly/2pPCuXM')])),
                ('file_relationships', models.TextField()),
                ('parameters', models.TextField()),
                ('analysis', models.OneToOneField(null=True, blank=True, to='core.Analysis')),
                ('tool_definition', models.ForeignKey(to='tool_manager.ToolDefinition')),
            ],
            options={
                'verbose_name': 'toollaunch',
                'permissions': (('read_toollaunch', 'Can read toollaunch'),),
            },
            bases=(models.Model,),
        ),
        migrations.RemoveField(
            model_name='toollaunch',
            name='analysis',
        ),
        migrations.RemoveField(
            model_name='toollaunch',
            name='tool_definition',
        ),
        migrations.DeleteModel(
            name='ToolLaunch',
        ),
    ]
