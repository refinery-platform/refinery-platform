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
        migrations.RemoveField(
            model_name='analysis',
            name='results',
        ),
        migrations.RenameField(
            model_name='analysisresult',
            old_name='_analysis',
            new_name='analysis',
        ),
        migrations.AlterField(
            model_name='analysisresult',
            name='analysis',
            field=models.ForeignKey(related_name='results', to='core.Analysis'),
        ),
    ]
