# encoding: utf8
from django.db import migrations, transaction, IntegrityError


def forwards(apps, schema_editor):
    pass


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]