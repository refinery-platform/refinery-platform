# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import sys

from django.db import models, migrations

from config import settings
from core.management.commands.create_public_group import create_public_group

def forwards(apps, schema_editor):
    create_public_group()

def backwards(apps, schema_editor):
    ExtendedGroup = apps.get_model("core", "ExtendedGroup")
    try:
        ExtendedGroup.objects.get(
            id=settings.REFINERY_PUBLIC_GROUP_ID).delete()
    except(ExtendedGroup.DoesNotExist,
           ExtendedGroup.MultipleObjectsReturned) as e:
        sys.stderr.write("Error fetching Public Group: {}".format(e))


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_auto_alter_userprofile'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards)
    ]
