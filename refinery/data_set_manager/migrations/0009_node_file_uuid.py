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
            name='file',
            field=models.ForeignKey(on_delete=models.deletion.PROTECT, default=None, to='file_store.FileStoreItem', null=True),
        ),
        # migrate data to the new field
        migrations.RunSQL(
            "UPDATE data_set_manager_node AS node SET file_id = file.id FROM file_store_filestoreitem AS file WHERE node.file_uuid = file.uuid",
            "UPDATE data_set_manager_node AS node SET file_uuid = file.uuid FROM file_store_filestoreitem AS file WHERE node.file_id = file.id"
        ),
        migrations.RemoveField(
            model_name='node',
            name='file_uuid',
        ),
    ]
