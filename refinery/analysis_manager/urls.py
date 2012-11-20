'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('analysis_manager.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'analysis', name="analysis"),
    url(r'^update_workflows/$', 'update_workflows'),
    url(r'^workflow_inputs/(?P<workflow_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'getWorkflowDataInputMap'),
    url(r'^analysis_run/$', 'analysis_run'),
)