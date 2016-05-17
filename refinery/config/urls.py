import logging
from django.conf import settings
from django.conf.urls import patterns, include, url
from django.conf.urls.static import static
from django.contrib import admin
from haystack.forms import FacetedSearchForm
from haystack.query import SearchQuerySet
from haystack.views import FacetedSearchView
from registration.backends.default.views import ActivationView
from tastypie.api import Api
from rest_framework import routers

from core.api import AnalysisResource, ProjectResource, NodeSetResource,\
    NodeResource, NodeSetListResource, NodePairResource,\
    NodeRelationshipResource, WorkflowResource, ExtendedGroupResource, \
    WorkflowInputRelationshipsResource, DataSetResource,\
    StatisticsResource, GroupManagementResource, \
    UserAuthenticationResource, InvitationResource, FastQCResource,  \
    UserProfileResource
from core.models import DataSet, AuthenticationFormUsernameOrEmail

from core.views import WorkflowViewSet, CustomRegistrationView
from file_store.views import FileStoreItemViewSet

from data_set_manager.views import Assays, AssaysFiles, AssaysAttributes

from data_set_manager.api import AttributeOrderResource, StudyResource,\
    AssayResource, InvestigationResource, ProtocolResource, \
    ProtocolReferenceResource, ProtocolReferenceParameterResource, \
    PublicationResource, AttributeResource

from core.forms import RegistrationFormWithCustomFields

logger = logging.getLogger(__name__)

# NG: facets for Haystack
sqs = (SearchQuerySet().using("core")
                       .models(DataSet)
                       .facet('measurement')
                       .facet('technology')
                       .highlight())

# Uncomment the next two lines to enable the admin:
admin.autodiscover()


# Django REST Framework urls
router = routers.DefaultRouter()
router.register(r'filestoreitems', FileStoreItemViewSet)
router.register(r'workflows', WorkflowViewSet)


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
v1_api.register(StatisticsResource())
v1_api.register(GroupManagementResource())
v1_api.register(UserAuthenticationResource())
v1_api.register(InvitationResource())
v1_api.register(InvestigationResource())
v1_api.register(ProtocolResource())
v1_api.register(ProtocolReferenceResource())
v1_api.register(ProtocolReferenceParameterResource())
v1_api.register(PublicationResource())
v1_api.register(AttributeResource())
v1_api.register(ExtendedGroupResource())
v1_api.register(FastQCResource())
v1_api.register(UserProfileResource())
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
    url(r'^docs/', include('rest_framework_swagger.urls')),

    # NG: added to include additional views for admin
    # (this is not the recommended way but the only one I got to work)
    # url(
    #     r"^admin/core/test_workflows/$",
    #     admin.site.admin_view(import_workflows)
    # ),
    # url(r"^admin/core/test_data/$", admin.site.admin_view(admin_test_data)),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^djangular/', include('djangular.urls')),
    # Needs to be defined before all default URL patterns are included because
    # in Django the first matched URL pattern wins
    url(
        r'^accounts/login/$',
        'django.contrib.auth.views.login',
        {
            'authentication_form': AuthenticationFormUsernameOrEmail
        },
        name='login'
    ),
    url(r'^accounts/', include('django.contrib.auth.urls')),
    url(r'^accounts/profile/$',
        'core.views.user_profile',
        name='user_profile'),
    url(
        r'^accounts/profile/edit/$',
        'core.views.user_profile_edit',
        name='user_profile_edit'
    ),

    url(
        r'^accounts/register/$',
        CustomRegistrationView.as_view(
            form_class=RegistrationFormWithCustomFields),
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
    # Wire up our API using automatic URL routing.
    url(r"^api/v2/", include(router.urls)),


    url(r'^api/v2/assays/(?P<uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{'
        r''r'12})/$', Assays.as_view()),

    url(r'^api/v2/assays/(?P<uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{'
        r''r'12})/files/$', AssaysFiles.as_view()),

    url(r'^api/v2/assays/(?P<uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{'
        r''r'12})/attributes/$', AssaysAttributes.as_view()),

    # (r'^favicon\.ico$',
    # 'django.views.generic.simple.redirect_to',
    # {'url': STATIC_URL+'images/favicon.ico'}),

) + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# for "static" see
# https://docs.djangoproject.com/en/dev/howto/static-files/#serving-static-files-during-development

# for using DjDT with mod_wsgi
# https://github.com/django-debug-toolbar/django-debug-toolbar/issues/529
if settings.DEBUG:
    try:
        import debug_toolbar
    except ImportError:
        logger.info(
            "Couldn't set up DjDT for use with mod_wsgi: missing debug_toolbar"
        )
    else:
        urlpatterns += patterns(
            '', url(r'^__debug__/', include(debug_toolbar.urls)),
        )
