# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import logging

from django.db import models, migrations
from requests import ConnectionError

import data_set_manager.tasks
import data_set_manager.utils

logger = logging.getLogger(__name__)


def annotate_existing_nodes(apps, schema_editor):

    for investigation in apps.get_model("data_set_manager",
                                        "Investigation").objects.all():
        try:
            data_set_manager.tasks.annotate_nodes(investigation.uuid)
        except ConnectionError:  # Expected during CI runs
            logger.error(
                "Could not connect to Solr while updating AnnotatedNodes"
            )
        except data_set_manager.utils.SolrQueryError as e:
            logger.error(
                "Something went wrong while querying Solr: %", e
            )


def noop(apps, schema_editor):
    return None  # Newer Django's > 1.8 have a migrations.RunPython.noop to
    # be able to move backwards in migrations yet have a data migration's
    # results remain


class Migration(migrations.Migration):

    dependencies = [
        ('data_set_manager', '0004_auto_20171211_1145'),
    ]

    operations = [
        migrations.RunPython(annotate_existing_nodes, noop),
    ]
