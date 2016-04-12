# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Instance',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('base_url', models.CharField(max_length=2000)),
                ('data_url', models.CharField(default=b'datasets', max_length=100)),
                ('api_url', models.CharField(default=b'api', max_length=100)),
                ('api_key', models.CharField(max_length=50)),
                ('description', models.CharField(default=b'', max_length=500, null=True, blank=True)),
                ('local_download', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
