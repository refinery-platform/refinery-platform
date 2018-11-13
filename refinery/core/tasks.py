import logging

import celery

from .models import SiteStatistics

logger = logging.getLogger(__name__)


@celery.task.task()
def collect_site_statistics():
    SiteStatistics.objects.create().collect()
