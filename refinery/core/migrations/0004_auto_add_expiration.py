# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_add_public_group'),
    ]

    operations = [
        migrations.AddField(
            model_name='download',
            name='expiration',
            field=models.DateTimeField(null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='nodegroup',
            name='expiration',
            field=models.DateTimeField(null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='nodeset',
            name='expiration',
            field=models.DateTimeField(null=True, blank=True),
            preserve_default=True,
        ),
    ]
