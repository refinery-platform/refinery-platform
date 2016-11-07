# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0002_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.CreateModel(
            name='_FileServerItem',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='BAMItem',
            fields=[
                ('_fileserveritem_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='file_server._FileServerItem')),
                ('index_file', models.ForeignKey(related_name='bamitem_index_file', blank=True, to='file_store.FileStoreItem', null=True)),
                ('tdf_file', models.ForeignKey(related_name='bamitem_tdf_file', blank=True, to='file_store.FileStoreItem', null=True)),
            ],
            options={
            },
            bases=('file_server._fileserveritem',),
        ),
        migrations.CreateModel(
            name='BigBEDItem',
            fields=[
                ('_fileserveritem_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='file_server._FileServerItem')),
            ],
            options={
            },
            bases=('file_server._fileserveritem',),
        ),
        migrations.CreateModel(
            name='TDFItem',
            fields=[
                ('_fileserveritem_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='file_server._FileServerItem')),
            ],
            options={
            },
            bases=('file_server._fileserveritem',),
        ),
        migrations.CreateModel(
            name='WIGItem',
            fields=[
                ('_fileserveritem_ptr', models.OneToOneField(parent_link=True, auto_created=True, primary_key=True, serialize=False, to='file_server._FileServerItem')),
                ('tdf_file', models.ForeignKey(blank=True, to='file_store.FileStoreItem', null=True)),
            ],
            options={
            },
            bases=('file_server._fileserveritem',),
        ),
        migrations.AddField(
            model_name='_fileserveritem',
            name='data_file',
            field=models.ForeignKey(to='file_store.FileStoreItem', unique=True),
            preserve_default=True,
        ),
    ]
