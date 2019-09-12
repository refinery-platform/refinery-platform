# -*- coding: utf-8 -*-


from django.db import models, migrations
import django_extensions.db.fields


class Migration(migrations.Migration):

    dependencies = [
        ('file_store', '0005_remove_filestoreitem_sharename'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filestoreitem',
            name='import_task_id',
            field=django_extensions.db.fields.UUIDField(auto=False, blank=True),
            preserve_default=True,
        ),
    ]
