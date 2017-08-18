'''
Created on Mar 31, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE

urlpatterns = patterns(
    'workflow_manager.views',
    url(r'^workflows/(?P<workflow_uuid>' + UUID_RE + r')/download/$',
        "download_workflow", name="download_workflow"),
    url(r'^workflows/import$', 'import_workflows'),
)
