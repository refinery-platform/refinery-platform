'''
Created on May 11, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('data_set_manager.views',
    url(r'^$', 'index', name="data_set_manager_base" ),
    url(r'^$', 'sqlindex' ),
)