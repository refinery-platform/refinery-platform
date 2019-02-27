# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0006_auto_20180124_1042'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attributedefinition',
            name='assay',
        ),
        migrations.RemoveField(
            model_name='attributedefinition',
            name='study',
        ),
        migrations.DeleteModel(
            name='AttributeDefinition',
        ),
    ]
