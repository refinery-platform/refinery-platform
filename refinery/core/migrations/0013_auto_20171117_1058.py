# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_auto_20171026_0939'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='analysis',
            name='workflow_dl_files',
        ),
        migrations.DeleteModel(
            name='WorkflowFilesDL',
        ),
    ]
