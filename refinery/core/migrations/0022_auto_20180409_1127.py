# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0021_auto_20180327_1923'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitestatistics',
            name='datasets_shared',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='datasets_uploaded',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='groups_created',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='run_date',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_user_logins',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_visualization_launches',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_workflow_launches',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='unique_user_logins',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='users_created',
            field=models.IntegerField(default=0),
        ),
    ]
