# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0036_migrate_analysisresult_analysis_uuid'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='analysisresult',
            name='analysis_uuid',
        ),
        migrations.AlterField(
            model_name='analysisresult',
            name='_analysis',
            field=models.ForeignKey(to='core.Analysis'),
        ),
        # migrations.RenameField(
        #     model_name='analysisresult',
        #     old_name='_analysis',
        #     new_name='analysis',
        # ),
    ]
