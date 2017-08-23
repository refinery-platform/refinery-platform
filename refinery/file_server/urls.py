'''
Created on Apr 21, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE

urlpatterns = patterns(
    'file_server.views',
    url(r'^$', 'index', name="file_server_base"),
    url(r'^tdf/(?P<uuid>' + UUID_RE + r')/cache'
        r'$', 'cache_tdf'),
    url(r'^tdf/(?P<uuid>' + UUID_RE + r')/'
        r'(?P<sequence_name>[a-zA-Z0-9]+)/(?P<zoom_level>z[0-9])/'
        r'(?P<start_location>[0-9]+)/(?P<end_location>[0-9]+)/$',
        'get_tdf_profile'),
    url(r'^tdf/(?P<uuid>' + UUID_RE + r')/'
        r'(?P<sequence_name>[a-zA-Z0-9]+)/zoom_levels$', 'get_zoom_levels'),
    url(r'^profile_viewer/(?P<uuid>' + UUID_RE + r')/'
        r'(?P<sequence_name>[a-zA-Z0-9]+)/(?P<start_location>[0-9]+)/'
        r'(?P<end_location>[0-9]+)/$', 'profile_viewer'),
    url(r'^api/v1/profile/$', 'profile', name='profile-view'),
)
