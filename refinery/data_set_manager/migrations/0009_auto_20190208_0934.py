# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0008_auto_20190104_1046'),
    ]

    operations = [
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.TextField()),
                ('value', models.TextField(null=True, blank=True)),
            ],
        ),
        migrations.AddField(
            model_name='assay',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='contact',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='factor',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='node',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='nodecollection',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='ontology',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='protocol',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='protocolparameter',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
        migrations.AddField(
            model_name='publication',
            name='comments',
            field=models.ManyToManyField(default=(), to='data_set_manager.Comment', blank=True),
        ),
    ]
