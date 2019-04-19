'''
Created on Apr 12, 2012

@author: nils
'''

from django.conf.urls import url

from constants import UUID_RE
from . import views

urlpatterns = [
    url(r'^(?P<uuid>' + UUID_RE + r')/$', views.analysis_status,
        name='analysis-status'),
    url(r'^analysis_cancel/$', views.analysis_cancel)
]
