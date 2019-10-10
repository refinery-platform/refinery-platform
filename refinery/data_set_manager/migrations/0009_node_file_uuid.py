# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0008_assay_uuid'),
        ('file_store', '0009_xls_filetypes_and_fileextensions'),
    ]

    operations = [
        migrations.AddField(
            model_name='node',
            name='file_item',
            field=models.ForeignKey(on_delete=models.deletion.SET_NULL, default=None, to='file_store.FileStoreItem', null=True),
        ),
        # migrate data to the new field
        migrations.RunSQL(
            "UPDATE data_set_manager_node AS node SET file_item_id = file_item.id FROM file_store_filestoreitem AS file_item WHERE node.file_uuid = file_item.uuid",
            "UPDATE data_set_manager_node AS node SET file_uuid = file_item.uuid FROM file_store_filestoreitem AS file_item WHERE node.file_item_id = file_item.id"
        ),
        migrations.RemoveField(
            model_name='node',
            name='file_uuid',
        ),
    ]
