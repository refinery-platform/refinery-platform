# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0006_auto_20171211_1145'),
        ('tool_manager', '0024_auto_20170828_1741'),
    ]

    operations = [
        migrations.CreateModel(
            name='OutputFile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', django_extensions.db.fields.UUIDField(unique=True, editable=False, blank=True)),
                ('name', models.TextField(max_length=100)),
                ('description', models.TextField(max_length=500)),
                ('is_merged', models.BooleanField(default=False)),
                ('filetype', models.ForeignKey(to='file_store.FileType')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='tooldefinition',
            name='output_files',
            field=models.ManyToManyField(to='tool_manager.OutputFile'),
            preserve_default=True,
        ),
    ]
