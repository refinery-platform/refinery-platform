# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_auto_20170524_1554'),
        ('tool_manager', '0018_auto_20170615_1629'),
    ]

    operations = [
        migrations.AddField(
            model_name='tool',
            name='dataset',
            field=models.OneToOneField(null=True, blank=True, to='core.DataSet'),
            preserve_default=True,
        ),
    ]
