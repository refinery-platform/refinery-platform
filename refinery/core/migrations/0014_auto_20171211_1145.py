# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_auto_20171117_1058'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analysisresult',
            name='analysis_uuid',
            field=django_extensions.db.fields.UUIDField(auto=False),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisresult',
            name='file_store_uuid',
            field=django_extensions.db.fields.UUIDField(auto=False),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='workflowdatainputmap',
            name='data_uuid',
            field=django_extensions.db.fields.UUIDField(auto=False),
            preserve_default=True,
        ),
    ]
