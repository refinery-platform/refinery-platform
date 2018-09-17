# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0006_require_contenttypes_0002'),
        ('core', '0026_auto_20180608_1123'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='primary_group',
            field=models.ForeignKey(blank=True, to='auth.Group', null=True),
        ),
    ]
