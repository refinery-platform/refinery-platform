# -*- coding: utf-8 -*-


from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0029_extend_site_profile_and_add_site_video'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='primary_group',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                blank=True,
                to='auth.Group',
                null=True
            ),
        ),
    ]
