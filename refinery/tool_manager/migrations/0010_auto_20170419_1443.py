# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_ontology_data'),
        ('tool_manager', '0009_auto_20170418_1706'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='visualizationdefinition',
            name='tooldefinition_ptr',
        ),
        migrations.DeleteModel(
            name='VisualizationDefinition',
        ),
        migrations.RemoveField(
            model_name='visualizationtoollaunch',
            name='toollaunch_ptr',
        ),
        migrations.DeleteModel(
            name='VisualizationToolLaunch',
        ),
        migrations.RemoveField(
            model_name='workflowdefinition',
            name='tooldefinition_ptr',
        ),
        migrations.DeleteModel(
            name='WorkflowDefinition',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='analysis',
        ),
        migrations.RemoveField(
            model_name='workflowtoollaunch',
            name='toollaunch_ptr',
        ),
        migrations.DeleteModel(
            name='WorkflowToolLaunch',
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='container_input_path',
            field=models.CharField(max_length=500, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='docker_image_name',
            field=models.CharField(max_length=255, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='galaxy_workflow_id',
            field=models.CharField(max_length=250, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='analysis',
            field=models.OneToOneField(null=True, blank=True, to='core.Analysis'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='container_name',
            field=models.CharField(blank=True, max_length=250, unique=True, null=True, validators=[django.core.validators.RegexValidator(regex=b'^[a-zA-Z0-9][a-zA-Z0-9_.-]$', message=b'`container_name` must adhere to Docker specs. See here: http://bit.ly/2pPCuXM')]),
            preserve_default=True,
        ),
    ]
