# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0025_auto_20180226_2153'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tooldefinition',
            name='container_input_path',
        ),
    ]
