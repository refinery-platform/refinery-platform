'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE

urlpatterns = patterns(
    'analysis_manager.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>' + UUID_RE + r')/$',
        'analysis_status', name="analysis-status"),
    url(r'^update_workflows/$', 'update_workflows'),
    url(r'^workflow_inputs/(?P<workflow_uuid>' + UUID_RE + r')/$',
        'get_workflow_data_input_map'),
    url(r'^analysis_cancel/$', 'analysis_cancel'),
    url(r'^run/$', 'run'),
    url(r'^create_noderelationship/$', 'create_noderelationship'),
)
