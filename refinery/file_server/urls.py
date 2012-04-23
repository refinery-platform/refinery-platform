'''
Created on Apr 21, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('file_server.views',
    url(r'^$', 'index'),
    #url(r'^(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'file'),
    url(r'^(?P<sequence_name>[a-zA-Z0-9]+)/(?P<zoom_level>z[0-9])/(?P<start_location>[0-9]+)/(?P<end_location>[0-9]+)/$', 'file' ),
)