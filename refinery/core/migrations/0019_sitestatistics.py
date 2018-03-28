# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_auto_20180306_1333'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteStatistics',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('run_date', models.DateTimeField()),
                ('datasets_uploaded', models.IntegerField(default=0)),
                ('datasets_shared', models.IntegerField(default=0)),
                ('users_created', models.IntegerField(default=0)),
                ('groups_created', models.IntegerField(default=0)),
                ('unique_user_logins', models.IntegerField(default=0)),
                ('total_user_logins', models.IntegerField(default=0)),
                ('total_workflow_launches', models.IntegerField(default=0)),
                ('total_visualization_launches', models.IntegerField(default=0)),
            ],
            options={
                'verbose_name_plural': 'Site Statistics',
            },
        ),
    ]
