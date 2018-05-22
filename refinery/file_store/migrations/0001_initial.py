# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone
import django_extensions.db.fields

from ..utils import SymlinkedFileSystemStorage


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='FileExtension',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=50)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='FileStoreItem',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('datafile', models.FileField(storage=SymlinkedFileSystemStorage(), max_length=1024, blank=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, max_length=36, editable=False, blank=True)),
                ('source', models.CharField(max_length=1024)),
                ('sharename', models.CharField(max_length=20, blank=True)),
                ('import_task_id', django_extensions.db.fields.UUIDField(max_length=36, editable=False, blank=True)),
                ('created', models.DateTimeField(default=django.utils.timezone.now, auto_now_add=True)),
                ('updated', models.DateTimeField(default=django.utils.timezone.now, auto_now=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='FileType',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=50)),
                ('description', models.CharField(max_length=250)),
                ('used_for_visualization', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='filestoreitem',
            name='filetype',
            field=models.ForeignKey(to='file_store.FileType', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='fileextension',
            name='filetype',
            field=models.ForeignKey(to='file_store.FileType'),
            preserve_default=True,
        ),
    ]
