# -*- coding: utf-8 -*-


from django.contrib.auth.management import create_permissions
from django.contrib.auth.models import User, Group
from django.db import models, migrations
from guardian.core import ObjectPermissionChecker
from guardian.shortcuts import assign_perm, remove_perm

from core.models import DataSet


def update_read_meta_dataset_permissions(apps, schema_editor):
    """Assign the `read_meta_dataset` permission to Datasets
    that existed in the system with the `read_dataset` permission"""

    # Permissions are only created after all migrations are run. Since this
    # data migration needs access to said permissions we manually trigger
    # their creation here.
    apps.models_module = True
    create_permissions(apps, verbosity=0)
    apps.models_module = None

    for dataset in DataSet.objects.all():
        for queryset in [User.objects.all(), Group.objects.all()]:
            for obj in queryset:
                permission_checker = ObjectPermissionChecker(obj)
                if permission_checker.has_perm("core.read_dataset", dataset):
                    assign_perm("core.read_meta_dataset", obj, dataset)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0015_auto_20171213_1429'),
    ]

    operations = [
        migrations.RunPython(update_read_meta_dataset_permissions, migrations.RunPython.noop),
    ]
