# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0003_auto_20170228_1432'),
    ]

    operations = [
        migrations.RenameField(
            model_name='galaxytoolparameter',
            old_name='galaxy_tool_id_temp',
            new_name='galaxy_tool_id',
        ),
        migrations.RenameField(
            model_name='galaxytoolparameter',
            old_name='galaxy_tool_parameter_temp',
            new_name='galaxy_tool_parameter',
        ),
    ]
