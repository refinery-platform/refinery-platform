# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='filerelationship',
            old_name='nested_elements',
            new_name='file_relationship',
        ),
    ]
