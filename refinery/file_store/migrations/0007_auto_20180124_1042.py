# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0006_auto_20171211_1145'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filestoreitem',
            name='created',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='filestoreitem',
            name='updated',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
