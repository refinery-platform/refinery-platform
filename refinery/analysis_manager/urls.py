'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('analysis_manager.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$',
        'analysis_status', name="analysis_status"),
    url(r'^update_workflows/$', 'update_workflows'),
    url(r'^workflow_inputs/(?P<workflow_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$',
        'getWorkflowDataInputMap'),
    url(r'^analysis_run/$', 'analysis_run'),
    url(r'^analysis_cancel/$', 'analysis_cancel'),
    url(r'^repository_run/$', 'repository_run'),
    url(r'^run_nodeset/$', 'run_nodeset'),
    url(r'^run_noderelationship/$', 'run_noderelationship'),
    url(r'^create_noderelationship/$', 'create_noderelationship'),
)