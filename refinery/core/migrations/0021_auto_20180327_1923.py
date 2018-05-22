# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0020_create_initial_site_statistics'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='sitestatistics',
            options={'verbose_name_plural': 'site statistics'},
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='datasets_shared',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='datasets_uploaded',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='groups_created',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_user_logins',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_visualization_launches',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='total_workflow_launches',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='unique_user_logins',
            field=models.IntegerField(),
        ),
        migrations.AlterField(
            model_name='sitestatistics',
            name='users_created',
            field=models.IntegerField(),
        ),
    ]
