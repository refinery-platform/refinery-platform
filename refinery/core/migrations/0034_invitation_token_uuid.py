# -*- coding: utf-8 -*-


from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0033_userprofile_uuid'),
    ]

    operations = [
        migrations.AddField(
            model_name='invitation',
            name='temp_uuid',
            field=models.UUIDField(null=True),
        ),
        # allow backward migrations and remove dependency on django_extensions
        migrations.AlterField(
            model_name='invitation',
            name='token_uuid',
            field=models.CharField(max_length=36, null=True),
        ),
        # copy data to the new field
        migrations.RunSQL(
            "UPDATE core_invitation SET temp_uuid = CAST (token_uuid AS uuid)",
            "UPDATE core_invitation SET token_uuid = temp_uuid"
        ),
        migrations.RemoveField(
            model_name='invitation',
            name='token_uuid',
        ),
        migrations.RenameField(
            model_name='invitation',
            old_name='temp_uuid',
            new_name='token_uuid',
        ),
        migrations.AlterField(
            model_name='invitation',
            name='token_uuid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
