# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnalysisStatus',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('refinery_import_task_group_id', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('galaxy_import_task_group_id', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('galaxy_export_task_group_id', django_extensions.db.fields.UUIDField(max_length=36, null=True, editable=False, blank=True)),
                ('galaxy_history_state', models.CharField(blank=True, max_length=10, choices=[(b'SUCCESS', b'OK'), (b'FAILURE', b'Error'), (b'PROGRESS', b'Running'), (b'PENDING', b'Unknown')])),
                ('galaxy_history_progress', models.PositiveSmallIntegerField(null=True, blank=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='analysisstatus',
            name='analysis',
            field=models.ForeignKey(to='core.Analysis'),
            preserve_default=True,
        ),
    ]
