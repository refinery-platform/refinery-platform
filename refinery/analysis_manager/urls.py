'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('analysis_manager.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'analysis'),
    url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/results$', 'analysis_results'),
)