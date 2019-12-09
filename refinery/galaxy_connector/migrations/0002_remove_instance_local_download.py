# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('galaxy_connector', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='instance',
            name='local_download',
        ),
    ]
