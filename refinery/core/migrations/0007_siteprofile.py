# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('sites', '0001_initial'),
        ('core', '0006_auto_20170524_1554'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteProfile',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('repo_mode_home_page_html', models.TextField(blank=True)),
                ('site', models.OneToOneField(related_name='profile', to='sites.Site')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
