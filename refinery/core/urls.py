'''
Created on Feb 20, 2012

@author: nils
'''

from django.conf.urls import patterns, url

from constants import UUID_RE
from rest_framework.routers import DefaultRouter

from .views import (AnalysisViewSet, DataSetsViewSet, EventViewSet,
                    GroupViewSet, GroupMemberAPIView, InvitationViewSet,
                    ObtainAuthTokenValidSession, OpenIDToken,
                    SiteProfileViewSet, UserProfileViewSet, WorkflowViewSet,
                    site_statistics)

urlpatterns = patterns(
    'core.views',
    url(r'^$', 'home', name="home"),
    url(r'^about/$', 'about', name="about"),
    url(r'^dashboard/$', 'dashboard', name="dashboard"),
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

    url(r'^data_sets/(?P<data_set_uuid>' + UUID_RE + r')/$',
        'data_set', name="data_set"),
    url(r'^data_sets/(?P<slug>[a-zA-Z0-9\_]+)/$',
        'data_set_slug', name="data_set_slug"),

    url(r'^workflows/(?P<uuid>' + UUID_RE + r')/$',
        'workflow', name="workflow"),
    url(r'^workflows/(?P<slug>[a-zA-Z0-9\_]+)/$',
        'workflow_slug', name="workflow_slug"),

    url(r'^solr/core/select/$', 'solr_core_search', name="solr_core_search"),

    url(r'^doi/(?P<id>.+)/', 'doi', name="doi"),

    url(r'^pubmed/abstract/(?P<id>.+)/',
        'pubmed_abstract', name="pubmed_abstract"),
    url(r'^pubmed/search/(?P<term>.+)/',
        'pubmed_search', name="pubmed_search"),
    url(r'^pubmed/summary/(?P<id>.+)/',
        'pubmed_summary', name="pubmed_summary"),
    url(r'^sitestatistics/(?P<type>(deltas)|(totals)).csv', site_statistics)
)

# DRF url routing
core_router = DefaultRouter()
core_router.register(r'workflows', WorkflowViewSet)
core_router.register(r'data_sets', DataSetsViewSet, 'data_sets')
core_router.register(r'groups', GroupViewSet, 'groups')
core_router.register(r'invitations', InvitationViewSet, 'invitations')
core_router.urls.extend([
    url(r'^events/$', EventViewSet.as_view()),
    url(r'^groups/(?P<uuid>' + UUID_RE + r')/members/$',
        GroupMemberAPIView.as_view()),
    url(r'^groups/(?P<uuid>' + UUID_RE + r')/members/(?P<id>\d)/$',
        GroupMemberAPIView.as_view()),
    url(r'^user_profile/(?P<uuid>' + UUID_RE + r')/$',
        UserProfileViewSet.as_view()),
    url(r'^analyses/$', AnalysisViewSet.as_view()),
    url(r'^analyses/(?P<uuid>' + UUID_RE + r')/$',
        AnalysisViewSet.as_view()),
    url(r'^openid_token/$',
        OpenIDToken.as_view(), name="openid-token"),
    url(r'^obtain-auth-token/', ObtainAuthTokenValidSession.as_view()),
    url(r'^site_profiles/$', SiteProfileViewSet.as_view()),
])
