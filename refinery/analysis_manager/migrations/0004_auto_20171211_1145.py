# -*- coding: utf-8 -*-


from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analysis_manager', '0003_auto_20170726_1601'),
    ]

    operations = [
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_export_task_group_id',
            field=models.CharField(max_length=36, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_import_task_group_id',
            field=models.CharField(max_length=36, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='galaxy_workflow_task_group_id',
            field=models.CharField(max_length=36, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='analysisstatus',
            name='refinery_import_task_group_id',
            field=models.CharField(max_length=36, null=True, blank=True),
            preserve_default=True,
        ),
    ]
