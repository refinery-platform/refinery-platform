# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import datetime
import django.core.validators
from django.utils.timezone import utc


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0008_auto_20170418_1623'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='visualizationdefinition',
            name='container_name',
        ),
        migrations.AddField(
            model_name='visualizationtoollaunch',
            name='container_name',
            field=models.CharField(default=datetime.datetime(2017, 4, 18, 21, 6, 13, 117553, tzinfo=utc), unique=True, max_length=250, validators=[django.core.validators.RegexValidator(regex=b'^[a-zA-Z0-9][a-zA-Z0-9_.-]$', message=b'`container_name` must adhere to Docker specs. See here: http://bit.ly/2pPCuXM')]),
            preserve_default=False,
        ),
    ]
