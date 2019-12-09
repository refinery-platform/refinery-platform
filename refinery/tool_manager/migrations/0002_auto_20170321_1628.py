# -*- coding: utf-8 -*-


from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='galaxyparameter',
            name='galaxy_tool_id',
        ),
        migrations.RemoveField(
            model_name='galaxyparameter',
            name='galaxy_tool_parameter',
        ),
    ]
