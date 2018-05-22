# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.utils import timezone


from core.models import DataSet, UserProfile


def create_initial_site_statistics(apps, schema_editor):
    SiteStatistics = apps.get_model("core", "SiteStatistics")
    User = apps.get_model("auth", "User")
    ExtendedGroup = apps.get_model("core", "ExtendedGroup")
    WorkflowTool = apps.get_model("tool_manager", "WorkflowTool")
    VisualizationTool = apps.get_model("tool_manager", "VisualizationTool")

    SiteStatistics.objects.create(
        run_date=timezone.now(),
        datasets_uploaded=DataSet.objects.count(),
        datasets_shared=len(
            [dataset for dataset in DataSet.objects.all() if dataset.shared]
        ),
        users_created=User.objects.count(),
        groups_created=ExtendedGroup.objects.exclude(manager_group=None).count(),
        unique_user_logins=User.objects.filter(
            last_login__lte=timezone.now()
        ).count(),
        total_user_logins=sum([u.login_count for u in
                              UserProfile.objects.all()]),
        total_workflow_launches=WorkflowTool.objects.count(),
        total_visualization_launches=VisualizationTool.objects.count()
    )


def noop(apps, schema_editor):
    return None  # Newer Django's >= 1.8 have a migrations.RunPython.noop to
    # be able to move backwards in migrations yet have a data migration's
    # results remain


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0019_sitestatistics'),
        ('tool_manager', '0025_auto_20180226_2153')
    ]

    operations = [
        migrations.RunPython(create_initial_site_statistics, noop),
    ]
