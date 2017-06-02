# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import datetime
from django.utils.timezone import utc
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0006_auto_20170418_1203'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='toollaunch',
            options={'verbose_name': 'ownableresource'},
        ),
        migrations.AlterModelOptions(
            name='workflowtoollaunch',
            options={'verbose_name': 'ownableresource'},
        ),
        migrations.RemoveField(
            model_name='toollaunch',
            name='start_date',
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='creation_date',
            field=models.DateTimeField(default=datetime.datetime(2017, 4, 18, 16, 33, 28, 226398, tzinfo=utc), auto_now_add=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='description',
            field=models.TextField(max_length=5000, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='modification_date',
            field=models.DateTimeField(default=datetime.datetime(2017, 4, 18, 16, 33, 33, 336000, tzinfo=utc), auto_now=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='name',
            field=models.CharField(max_length=250, null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='slug',
            field=models.CharField(max_length=250, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='summary',
            field=models.CharField(max_length=1000, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='toollaunch',
            name='uuid',
            field=django_extensions.db.fields.UUIDField(default=None, unique=True, max_length=36, editable=False, blank=True),
            preserve_default=False,
        ),
    ]
