from django.conf.urls.defaults import patterns, include, url
from django.conf.urls.static import static
from django.contrib import admin
from haystack.forms import FacetedSearchForm
from haystack.query import SearchQuerySet
from haystack.views import FacetedSearchView
from registration.forms import RegistrationFormUniqueEmail
from registration.backends.default.views import ActivationView
from registration.backends.default.views import RegistrationView
from tastypie.api import Api
from core.api import AnalysisResource, ProjectResource, NodeSetResource,\
    NodeResource, NodeSetListResource, NodePairResource,\
    NodeRelationshipResource, WorkflowResource,\
    WorkflowInputRelationshipsResource, DataSetResource,\
    ExternalToolStatusResource, StatisticsResource, \
    GroupManagementResource, UserAuthenticationResource, InvitationResource
from core.models import DataSet
from data_set_manager.api import AttributeOrderResource, StudyResource,\
    AssayResource
from data_set_manager.views import search_typeahead
from settings import MEDIA_ROOT, MEDIA_URL


# NG: facets for Haystack
sqs = (SearchQuerySet().using("core")
                       .models(DataSet)
                       .facet('measurement')
                       .facet('technology')
                       .highlight())

# Uncomment the next two lines to enable the admin:
admin.autodiscover()

# NG: added for tastypie URL
v1_api = Api(api_name='v1')
v1_api.register(AnalysisResource())
v1_api.register(ProjectResource())
v1_api.register(StudyResource())
v1_api.register(AssayResource())
v1_api.register(DataSetResource())
v1_api.register(AttributeOrderResource())
v1_api.register(NodeResource())
v1_api.register(NodeSetResource())
v1_api.register(NodeSetListResource())
v1_api.register(NodePairResource())
v1_api.register(NodeRelationshipResource())
v1_api.register(WorkflowResource())
v1_api.register(WorkflowInputRelationshipsResource())
v1_api.register(ExternalToolStatusResource())
v1_api.register(StatisticsResource())
v1_api.register(GroupManagementResource())
v1_api.register(UserAuthenticationResource())
v1_api.register(InvitationResource())
# v1_api.register(TaxonResource())
# v1_api.register(GenomeBuildResource())
# v1_api.register(CytoBandResource())
# v1_api.register(ChromInfoResource())
# v1_api.register(GeneResource())
# v1_api.register(GapRegionFileResource())
# v1_api.register(WigDescriptionResource())
# v1_api.register(EmpiricalMappabilityResource())
# v1_api.register(TheoreticalMappabilityResource())
# v1_api.register(GCContentResource())
# v1_api.register(ConservationTrackResource())
# v1_api.register(hg19_GenCodeResource())
# v1_api.register(ce10_WormBaseResource())
# v1_api.register(dm3_FlyBaseResource())


# patterns for all of the different applications
urlpatterns = patterns(
    '',
    # links in core urls
    url(r'^', include('core.urls')),

    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^workflow_manager/', include('workflow_manager.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
    url(r'^visualization_manager/', include('visualization_manager.urls')),
    url(r'^file_server/', include('file_server.urls')),

    url(r'^tasks/', include('djcelery.urls')),

    # NG: added to include additional views for admin
    # (this is not the recommended way but the only one I got to work)
    # url(
    #     r"^admin/core/test_workflows/$",
    #     admin.site.admin_view(import_workflows)
    # ),
    # url(r"^admin/core/test_data/$", admin.site.admin_view(admin_test_data)),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^djangular/', include('djangular.urls')),
    url(
        r'^accounts/password/reset/confirm/' +
        '(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$',
        'django.contrib.auth.views.password_reset_confirm',
        {
            'post_reset_redirect': '/accounts/login/?next=/'
        }
    ),
    url(r'^accounts/profile/$', 'core.views.user_profile', name='user_profile'),
    url(
        r'^accounts/profile/edit/$',
        'core.views.user_profile_edit',
        name='user_profile_edit'
    ),

    url(
        r'^accounts/register/$',
        RegistrationView.as_view(),
        name='registration.views.register'
    ),

    url(
        r'^activate/(?P<activation_key>\w+)/$',
        ActivationView.as_view(),
        name='registration.views.activate'
    ),

    url(r'^accounts/', include('registration.backends.default.urls')),

    # NG: tastypie API urls
    url(r'^api/', include(v1_api.urls)),

    # NG: Haystack (searching and querying) urls
    # url(r'^search/', include('haystack.urls')),
    url(
        r'^search/',
        FacetedSearchView(
            form_class=FacetedSearchForm,
            searchqueryset=sqs
        ),
        name='search'
    ),
    url(r'^typeahead/$', search_typeahead),

    # (r'^favicon\.ico$',
    # 'django.views.generic.simple.redirect_to',
    # {'url': STATIC_URL+'images/favicon.ico'}),

) + static(MEDIA_URL, document_root=MEDIA_ROOT)
# for "static" see
# https://docs.djangoproject.com/en/dev/howto/static-files/#serving-other-directories
