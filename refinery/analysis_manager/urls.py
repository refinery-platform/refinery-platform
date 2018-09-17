'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE

urlpatterns = patterns(
    'analysis_manager.views',
    url(r'^(?P<uuid>' + UUID_RE + r')/$',
        'analysis_status', name="analysis-status"),
    url(r'^analysis_cancel/$', 'analysis_cancel')
)
