# -*- coding: utf-8 -*-


from django.db import migrations


def delete_attributedefinition_content_type(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='data_set_manager',
                               model='attributedefinition').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0006_auto_20180124_1042'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attributedefinition',
            name='assay',
        ),
        migrations.RemoveField(
            model_name='attributedefinition',
            name='study',
        ),
        migrations.DeleteModel(
            name='AttributeDefinition',
        ),
        # to avoid a prompt about deleting stale content types
        migrations.RunPython(delete_attributedefinition_content_type,
                             migrations.RunPython.noop)
    ]
