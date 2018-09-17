# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0015_auto_20170420_1010'),
    ]

    operations = [
        migrations.RenameField(
            model_name='tooldefinition',
            old_name='docker_image_name',
            new_name='image_name',
        ),
    ]
