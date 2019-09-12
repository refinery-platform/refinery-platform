# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0027_tool_display_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='tooldefinition',
            name='mem_reservation_mb',
            field=models.IntegerField(default=10),
        ),
    ]
