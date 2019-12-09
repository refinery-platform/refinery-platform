# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_event_datetime'),
    ]

    operations = [
        migrations.RenameField(
            model_name='event',
            old_name='dataset',
            new_name='data_set',
        ),
        migrations.RenameField(
            model_name='event',
            old_name='datetime',
            new_name='date_time',
        ),
    ]
