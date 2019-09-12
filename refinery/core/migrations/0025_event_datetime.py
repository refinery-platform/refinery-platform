# -*- coding: utf-8 -*-


from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0024_auto_20180606_1216'),
    ]

    operations = [
        migrations.AddField(
            model_name='event',
            name='datetime',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
