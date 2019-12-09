# -*- coding: utf-8 -*-


from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0028_auto_20180611_1640'),
    ]

    operations = [
        migrations.CreateModel(
            name='SiteVideo',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False,
                                        auto_created=True, primary_key=True)),
                ('caption', models.TextField(blank=True)),
                ('source', models.CharField(max_length=100, blank=True)),
                ('source_id', models.CharField(max_length=100)),
            ],
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='about_markdown',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='intro_markdown',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='siteprofile',
            name='twitter_username',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='sitevideo',
            name='site_profile',
            field=models.ForeignKey(to='core.SiteProfile'),
        ),
    ]
