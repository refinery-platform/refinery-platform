'''
Created on Feb 20, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE
from rest_framework.routers import DefaultRouter

from .views import (AnalysesViewSet, DataSetsViewSet, NodeViewSet, OpenIDToken,
                    WorkflowViewSet)

urlpatterns = patterns(
    'core.views',
    url(r'^$', 'home', name="home"),
    url(r'^about/$', 'about', name="about"),
    url(r'^statistics/$', 'statistics', name="statistics"),
    url(r'^collaboration/$', 'collaboration', name='collaboration'),
    url(r'^group_invite/(?P<token>' + UUID_RE + r')/$',
        'group_invite', name='group_invite'),

    url(r'^users/(?P<query>[\@\.\-\+a-z0-9]+)/$', 'user'),
    # "name" is required for use with the url tag in templates
    url(r'^users/(?P<query>' + UUID_RE + r')/$',
        'user', name="user"),
    url(r'^users/(?P<uuid>' + UUID_RE + r')/edit/$',
        'user_edit', name="user_edit"),

    url(r'^groups/(?P<query>' + UUID_RE + r')/$',
        'group', name="group"),

    url(r'^projects/(?P<uuid>' + UUID_RE + r')/$',
        'project', name="project"),
    url(r'^projects/new/$', 'project_new', name="project_new"),
    url(r'^projects/(?P<slug>[a-zA-Z0-9\_]+)/$',
        'project_slug', name="project_slug"),
    url(r'^projects/(?P<uuid>' + UUID_RE + r')/edit/$',
        'project_edit', name="project_edit"),

    url(r'^data_sets/(?P<data_set_uuid>' + UUID_RE + r')/$',
        'data_set', name="data_set"),
    url(r'^data_sets/(?P<slug>[a-zA-Z0-9\_]+)/$',
        'data_set_slug', name="data_set_slug"),

    url(r'^workflows/(?P<uuid>' + UUID_RE + r')/$',
        'workflow', name="workflow"),
    url(r'^workflows/(?P<uuid>' + UUID_RE + r')/edit/$',
        'workflow_edit', name="workflow_edit"),
    url(r'^workflows/(?P<slug>[a-zA-Z0-9\_]+)/$',
        'workflow_slug', name="workflow_slug"),

    url(r'^workflow_engines/(?P<uuid>' + UUID_RE + r')/$',
        'workflow_engine', name="workflow_engine"),

    url(r'^solr/core/select/$', 'solr_core_search', name="solr_core_search"),

    url(r'^doi/(?P<id>.+)/', 'doi', name="doi"),

    url(r'^pubmed/abstract/(?P<id>.+)/',
        'pubmed_abstract', name="pubmed_abstract"),
    url(r'^pubmed/search/(?P<term>.+)/',
        'pubmed_search', name="pubmed_search"),
    url(r'^pubmed/summary/(?P<id>.+)/',
        'pubmed_summary', name="pubmed_summary"),

    url(r'^neo4j/annotations/$',
        'neo4j_dataset_annotations', name="neo4j_dataset_annotations"),
    url(r'^auto_login/$', 'auto_login', name='auto_login')
)

# DRF url routing
core_router = DefaultRouter()
core_router.register(r'nodes', NodeViewSet)
core_router.register(r'workflows', WorkflowViewSet)
core_router.urls.extend([
    url(r'^data_sets/(?P<uuid>' + UUID_RE + r')/$',
        DataSetsViewSet.as_view()),
    url(r'^analyses/(?P<uuid>' + UUID_RE + r')/$',
        AnalysesViewSet.as_view()),
    url(r'^openid_token/$',
        OpenIDToken.as_view(), name="openid-token")
])
