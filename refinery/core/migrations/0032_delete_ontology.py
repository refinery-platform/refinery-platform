# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0031_remove_tutorials_launchpad_tutorial_viewed'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Ontology',
        ),
    ]
