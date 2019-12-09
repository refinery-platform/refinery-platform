# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tool_manager', '0026_remove_tooldefinition_container_input_path'),
    ]

    operations = [
        migrations.AddField(
            model_name='tool',
            name='display_name',
            field=models.CharField(max_length=250, unique=True, null=True),
        ),
    ]
