# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0001_initial'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisstatus',
            name='analysis',
            field=models.ForeignKey(to='core.Analysis'),
            preserve_default=True,
        ),
    ]
