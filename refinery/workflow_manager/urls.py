'''
Created on Mar 31, 2012

@author: nils
'''

from django.conf.urls import patterns, url

urlpatterns = patterns(
    'workflow_manager.views',
    url(r'^workflows/(?P<workflow_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/'
        r'download/$', "download_workflow", name="download_workflow"),
    url(r'^workflows/import$', 'import_workflows'),
)
