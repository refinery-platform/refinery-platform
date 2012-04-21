'''
Created on Apr 21, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('file_server.views',
    url(r'^$', 'index'),
    url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'file'),
)