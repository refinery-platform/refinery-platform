'''
Created on Apr 21, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('visualization_manager.views',
    url(r'^igv_session$', 'igv_session', name="igv_session" ),
)