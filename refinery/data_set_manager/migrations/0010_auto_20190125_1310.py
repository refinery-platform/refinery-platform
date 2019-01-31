# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0009_auto_20190123_1118'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assay',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='contact',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='factor',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='node',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='nodecollection',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='ontology',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='protocol',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='protocolparameter',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AlterField(
            model_name='publication',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
    ]
