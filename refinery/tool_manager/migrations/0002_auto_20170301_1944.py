# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='parameter',
            old_name='is_editable',
            new_name='is_user_adjustable',
        ),
        migrations.AlterField(
            model_name='tooldefinition',
            name='description',
            field=models.TextField(max_length=500),
            preserve_default=True,
        ),
    ]
