# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='annotatednode',
            name='attribute_subtype',
            field=models.TextField(null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='attribute_type',
            field=models.TextField(),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='attribute_value',
            field=models.TextField(null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='node_genome_build',
            field=models.TextField(null=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='node_name',
            field=models.TextField(),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='node_species',
            field=models.IntegerField(null=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednode',
            name='node_type',
            field=models.TextField(),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='annotatednoderegistry',
            name='node_type',
            field=models.TextField(),
            preserve_default=True,
        ),
    ]
