# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_auto_20171026_0939'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='dataset',
            options={'verbose_name': 'dataset', 'permissions': (('read_dataset', 'Can read dataset'), ('read_meta_dataset', 'Can read meta dataset'), ('share_dataset', 'Can share dataset'))},
        ),
    ]
