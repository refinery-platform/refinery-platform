# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_siteprofile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analysisnodeconnection',
            name='filename',
            field=models.CharField(max_length=500),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisnodeconnection',
            name='name',
            field=models.CharField(max_length=500),
            preserve_default=True,
        ),
    ]
