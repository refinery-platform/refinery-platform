'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls import patterns, url


urlpatterns = patterns(
    'analysis_manager.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$',
        'analysis_status', name="analysis-status"),
    url(r'^update_workflows/$', 'update_workflows'),
    url(r'^workflow_inputs/(?P<workflow_uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$',
        'getWorkflowDataInputMap'),
    url(r'^analysis_cancel/$', 'analysis_cancel'),
    url(r'^run/$', 'run'),
    url(r'^create_noderelationship/$', 'create_noderelationship'),
)
