# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_ontology_data'),
        ('tool_manager', '0014_auto_20170419_1509'),
    ]

    operations = [
        migrations.AddField(
            model_name='tooldefinition',
            name='workflow_engine',
            field=models.ForeignKey(blank=True, to='core.WorkflowEngine', null=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='tooldefinition',
            name='docker_image_name',
            field=models.CharField(default='', max_length=255, blank=True),
            preserve_default=False,
        ),
    ]
