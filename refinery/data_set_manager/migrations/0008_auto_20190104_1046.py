# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0007_remove_attribute_definition'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='protocolcomponent',
            name='study',
        ),
        migrations.RemoveField(
            model_name='protocolparameter',
            name='study',
        ),
    ]
