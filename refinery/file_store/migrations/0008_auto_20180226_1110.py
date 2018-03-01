# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0007_auto_20180124_1042'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filestoreitem',
            name='source',
            field=models.CharField(max_length=1024, blank=True),
        ),
    ]
