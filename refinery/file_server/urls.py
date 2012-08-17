'''
Created on Apr 21, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url


urlpatterns = patterns('file_server.views',
    url(r'^$', 'index', name="file_server_base" ),
    #url(r'^tdf/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'tdf_data_sets' ),
    url(r'^tdf/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/cache$', 'cache_tdf' ),
    url(r'^tdf/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<sequence_name>[a-zA-Z0-9]+)/(?P<zoom_level>z[0-9])/(?P<start_location>[0-9]+)/(?P<end_location>[0-9]+)/$', 'get_tdf_profile' ),
    url(r'^tdf/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<sequence_name>[a-zA-Z0-9]+)/zoom_levels$', 'get_zoom_levels' ),
    url(r'^profile_viewer/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<sequence_name>[a-zA-Z0-9]+)/(?P<start_location>[0-9]+)/(?P<end_location>[0-9]+)/$', 'profile_viewer' ),

    url(r'^api/v1/profile/$', 'profile', name='profile-view' ),

)