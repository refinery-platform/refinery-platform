# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0037_remove_analysisresult_analysis_uuid'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='analysis',
            name='results',
        ),
    ]
