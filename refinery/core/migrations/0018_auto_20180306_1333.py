# -*- coding: utf-8 -*-


from django.db import migrations, models


def delete_workflowinput_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='core',
                               model='workflowdatainput').delete()
    ContentType.objects.filter(app_label='core',
                               model='workflowdatainputmap').delete()
    ContentType.objects.filter(app_label='core',
                               model='workflowinputrelationships').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_delete_diskquota'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='analysis',
            name='workflow_data_input_maps',
        ),
        migrations.RemoveField(
            model_name='workflow',
            name='data_inputs',
        ),
        migrations.RemoveField(
            model_name='workflow',
            name='input_relationships',
        ),
        migrations.DeleteModel(
            name='WorkflowDataInput',
        ),
        migrations.DeleteModel(
            name='WorkflowDataInputMap',
        ),
        migrations.DeleteModel(
            name='WorkflowInputRelationships',
        ),
        # to avoid a prompt about deleting stale content types
        migrations.RunPython(delete_workflowinput_content_types,
                             migrations.RunPython.noop)
    ]
