# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_auto_20180608_1123'),
    ]

    operations = [
        migrations.RenameField(
            model_name='event',
            old_name='json',
            new_name='details',
        ),
    ]
