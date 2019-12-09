# -*- coding: utf-8 -*-


import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0007_remove_attribute_definition'),
    ]

    operations = [
        migrations.AddField(
            model_name='assay',
            name='temp_uuid',
            field=models.UUIDField(null=True),
        ),
        # to allow backward migrations after removing this field
        migrations.AlterField(
            model_name='assay',
            name='uuid',
            field=models.CharField(max_length=36, null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE data_set_manager_assay SET temp_uuid = CAST (uuid AS uuid)",
            "UPDATE data_set_manager_assay SET uuid = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='assay',
            name='uuid',
        ),
        migrations.RenameField(
            model_name='assay',
            old_name='temp_uuid',
            new_name='uuid',
        ),
        migrations.AlterField(
            model_name='assay',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
