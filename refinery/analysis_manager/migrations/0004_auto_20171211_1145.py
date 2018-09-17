# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0003_auto_20170726_1601'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_export_task_group_id',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_import_task_group_id',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_workflow_task_group_id',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='refinery_import_task_group_id',
            field=django_extensions.db.fields.UUIDField(auto=False, null=True, blank=True),
            preserve_default=True,
        ),
    ]
