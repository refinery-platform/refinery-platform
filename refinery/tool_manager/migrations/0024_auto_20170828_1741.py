# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0023_visualizationtool_workflowtool'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='outputfile',
            name='filetype',
        ),
        migrations.RemoveField(
            model_name='tooldefinition',
            name='output_files',
        ),
        migrations.DeleteModel(
            name='OutputFile',
        ),
    ]
