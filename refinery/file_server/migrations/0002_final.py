# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('file_server', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='bamitem',
            name='_fileserveritem_ptr',
        ),
        migrations.RemoveField(
            model_name='bamitem',
            name='index_file',
        ),
        migrations.RemoveField(
            model_name='bamitem',
            name='tdf_file',
        ),
        migrations.DeleteModel(
            name='BAMItem',
        ),
        migrations.RemoveField(
            model_name='bigbeditem',
            name='_fileserveritem_ptr',
        ),
        migrations.DeleteModel(
            name='BigBEDItem',
        ),
        migrations.RemoveField(
            model_name='tdfitem',
            name='_fileserveritem_ptr',
        ),
        migrations.DeleteModel(
            name='TDFItem',
        ),
        migrations.RemoveField(
            model_name='wigitem',
            name='_fileserveritem_ptr',
        ),
        migrations.RemoveField(
            model_name='wigitem',
            name='tdf_file',
        ),
        migrations.DeleteModel(
            name='WIGItem',
        ),
        migrations.RemoveField(
            model_name='_fileserveritem',
            name='data_file',
        ),
        migrations.DeleteModel(
            name='_FileServerItem',
        ),
    ]
