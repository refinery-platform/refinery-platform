# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_auto_20170524_1554'),
        ('tool_manager', '0021_auto_20170626_0819'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tooldefinition',
            name='galaxy_workflow_id',
        ),
        migrations.RemoveField(
            model_name='tooldefinition',
            name='workflow_engine',
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='workflow',
            field=models.ForeignKey(to='core.Workflow', null=True),
            preserve_default=True,
        ),
    ]
