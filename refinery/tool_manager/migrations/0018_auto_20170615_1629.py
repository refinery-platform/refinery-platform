# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0017_tooldefinition_extra_directories'),
    ]

    operations = [
        migrations.RenameField(
            model_name='tool',
            old_name='file_relationships',
            new_name='tool_launch_configuration',
        ),
        migrations.RemoveField(
            model_name='tool',
            name='parameters',
        ),
        migrations.RemoveField(
            model_name='tooldefinition',
            name='extra_directories',
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='annotation',
            field=models.TextField(default='{}'),
            preserve_default=False,
        ),
    ]
