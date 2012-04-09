'''
Created on Feb 20, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('core.views',
    url(r'^$', 'index'),
    url(r'^user/(?P<query>[\@\.\-\+a-z0-9]+)/$', 'user'),
        # "name" is required for use with the url tag in templates
    url(r'^user/(?P<query>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'user', name="user"),
    url(r'^project/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'project', name="project"),
    url(r'^data_set/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'data_set', name="data_set"),
    url(r'^workflow/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'workflow', name="workflow"),
    url(r'^workflow_engine/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'workflow_engine', name="workflow_engine"),
)