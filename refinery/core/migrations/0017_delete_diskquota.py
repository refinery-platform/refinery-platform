# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def delete_diskquota_content_type(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='core', model='diskquota').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_update_read_meta_permissions'),
    ]

    operations = [
        migrations.DeleteModel(
            name='DiskQuota',
        ),
        # to avoid a prompt about deleting stale content types
        migrations.RunPython(delete_diskquota_content_type,
                             migrations.RunPython.noop)
    ]
