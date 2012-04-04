'''
Created on Mar 31, 2012

@author: nils
'''

#isatab pages
from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('workflow_manager.views',
    url(r'^workflows$', 'index'),
)