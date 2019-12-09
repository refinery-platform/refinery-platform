# -*- coding: utf-8 -*-


from django.db import migrations


def delete_ontology_content_type(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='core', model='ontology').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_remove_tutorials_launchpad_tutorial_viewed'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Ontology',
        ),
        # to avoid a prompt about deleting stale content types
        migrations.RunPython(delete_ontology_content_type,
                             migrations.RunPython.noop)
    ]
