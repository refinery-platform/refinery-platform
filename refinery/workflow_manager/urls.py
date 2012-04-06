'''
Created on Mar 31, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('workflow_manager.views',
    url(r'^(?P<workflow_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/download/$', "download_workflow"),
    url(r'^import$', 'import_workflows'),        
)

