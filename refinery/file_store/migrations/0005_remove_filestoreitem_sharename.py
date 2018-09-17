# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0004_auto_20171117_1420'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='filestoreitem',
            name='sharename',
        ),
    ]
