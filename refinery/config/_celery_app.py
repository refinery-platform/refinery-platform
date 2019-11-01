from __future__ import absolute_import

import os

from celery import Celery as app_creator

from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = app_creator('config')
app.config_from_object(settings)
app.autodiscover_tasks(settings.INSTALLED_APPS)
