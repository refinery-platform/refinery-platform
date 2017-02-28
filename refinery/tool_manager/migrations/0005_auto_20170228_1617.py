# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0004_auto_20170228_1433'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='GalaxyToolParameter',
            new_name='GalaxyParameter',
        ),
    ]
