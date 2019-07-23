# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0034_invitation_token_uuid'),
    ]

    operations = [
        # use a temp name for the new foreign key to avoid error
        # Reverse query name for 'Analysis.results' clashes with field name 'AnalysisResult.analysis'
        migrations.AddField(
            model_name='analysisresult',
            name='_analysis',
            field=models.ForeignKey(to='core.Analysis', null=True),
        ),
        # allow backward migrations and remove dependency on django_extensions
        migrations.AlterField(
            model_name='analysisresult',
            name='analysis_uuid',
            field=models.CharField(max_length=36, null=True),
        ),
    ]
