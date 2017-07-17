# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0016_auto_20170424_1753'),
    ]

    operations = [
        migrations.AddField(
            model_name='tooldefinition',
            name='extra_directories',
            field=models.CharField(max_length=500, blank=True),
            preserve_default=True,
        ),
    ]
