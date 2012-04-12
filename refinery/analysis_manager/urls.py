'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('analysis_manager.views',
    url(r'^$', 'index'),
)