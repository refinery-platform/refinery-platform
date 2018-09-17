# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0003_auto_20170911_2119'),
    ]

    operations = [
        migrations.AlterField(
            model_name='annotatednode',
            name='node_analysis_uuid',
            field=django_extensions.db.fields.UUIDField(default=None, auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='investigation',
            name='isarchive_file',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='investigation',
            name='pre_isarchive_file',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='node',
            name='analysis_uuid',
            field=django_extensions.db.fields.UUIDField(default=None, auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='node',
            name='file_uuid',
            field=django_extensions.db.fields.UUIDField(default=None, auto=False, null=True, blank=True),
            preserve_default=True,
        ),
    ]
