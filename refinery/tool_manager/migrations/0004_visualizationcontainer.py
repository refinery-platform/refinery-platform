# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0003_auto_20170322_1207'),
    ]

    operations = [
        migrations.CreateModel(
            name='VisualizationContainer',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('image_name', models.CharField(max_length=255)),
                ('container_name', models.CharField(max_length=150)),
            ],
            options={
                'verbose_name': 'Visualization Containers',
                'permissions': (('read_Visualization Containers', 'Can read Visualization Containers'), ('share_Visualization Containers', 'Can share Visualization Containers')),
            },
            bases=(models.Model,),
        ),
    ]
