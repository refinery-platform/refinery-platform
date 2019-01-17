# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_auto_20180611_1640'),
    ]

    operations = [
        migrations.AddField(
            model_name='siteprofile',
            name='about_markdown',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='intro_markdown',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='twitter_username',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='yt_videos',
            field=models.TextField(blank=True),
        ),
    ]
