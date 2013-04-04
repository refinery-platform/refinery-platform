from core.api import ProjectResource, NodeSetResource, NodeResource, \
    NodeSetListResource, NodePairResource, NodeRelationshipResource, WorkflowResource, \
    WorkflowInputRelationshipsResource
from core.forms import RegistrationFormTermsOfServiceUniqueEmail
from core.models import DataSet
from core.views import admin_test_data
from data_set_manager.api import AttributeOrderResource, StudyResource, \
    AssayResource
from data_set_manager.views import search_typeahead
from django.conf.urls.defaults import patterns, include, url
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.sites.models import Site
from haystack.forms import FacetedSearchForm
from haystack.query import SearchQuerySet
from haystack.views import FacetedSearchView
from registration.forms import RegistrationFormUniqueEmail
from settings import MEDIA_ROOT, MEDIA_URL, STATIC_URL, REFINERY_DISABLE_REGISTRATION
from tastypie.api import Api
from workflow_manager.views import import_workflows


# NG: facets for Haystack
sqs = SearchQuerySet().using( "core" ).models( DataSet ).facet('measurement').facet('technology').highlight()

# Uncomment the next two lines to enable the admin:
admin.autodiscover()

# NG: added for tastypie URL
v1_api = Api(api_name='v1')
v1_api.register(ProjectResource())
v1_api.register(StudyResource())
v1_api.register(AssayResource())
v1_api.register(AttributeOrderResource())
v1_api.register(NodeResource())
v1_api.register(NodeSetResource())
v1_api.register(NodeSetListResource())
v1_api.register(NodePairResource())
v1_api.register(NodeRelationshipResource())
v1_api.register(WorkflowResource())
v1_api.register(WorkflowInputRelationshipsResource())

#patterns for all of the different applications
urlpatterns = patterns('',    
    #links in core urls
    url(r'^', include('core.urls')),

    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^workflow_manager/', include('workflow_manager.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
    url(r'^visualization_manager/', include('visualization_manager.urls')),
    url(r'^file_server/', include('file_server.urls')),

    #links in galaxy_connector urls 
    url(r'^galaxy_connector/', include('galaxy_connector.urls')),

    # Examples:
    # url(r'^$', 'refinery.views.home', name='home'),
    # url(r'^refinery/', include('refinery.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    url(r'^tasks/', include('djcelery.urls')),

    # NG: added to include additional views for admin (this is not the recommended way but the only one I got to work)
    #url(r"^admin/core/test_workflows/$", admin.site.admin_view( import_workflows ) ),    
    #url(r"^admin/core/test_data/$", admin.site.admin_view( admin_test_data ) ),    
    url(r'^admin/', include(admin.site.urls)),
    
    url(r'^accounts/password/reset/confirm/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'django.contrib.auth.views.password_reset_confirm', {'post_reset_redirect': '/accounts/login/?next=/'}),
    url(r'^accounts/profile/$', 'core.views.user_profile', name='user_profile'),
    url(r'^accounts/profile/edit/$', 'core.views.user_profile_edit', name='user_profile_edit'),

    # NG: tastypie API urls
    url(r'^api/', include(v1_api.urls)),
    
    # NG: Haystack (searching and querying) urls
    #url(r'^search/', include('haystack.urls')),
    url(r'^search/', FacetedSearchView(form_class=FacetedSearchForm, searchqueryset=sqs), name='search' ),
    url(r'^typeahead/$', search_typeahead),

    (r'^favicon\.ico$', 'django.views.generic.simple.redirect_to', {'url': STATIC_URL+'images/favicon.ico'}),

) + static( MEDIA_URL, document_root=MEDIA_ROOT)
# for "static" see https://docs.djangoproject.com/en/dev/howto/static-files/#serving-other-directories

if not REFINERY_DISABLE_REGISTRATION:
    urlpatterns += patterns('',
                            url(r'^accounts/register/$', 'registration.views.register', {'form_class': RegistrationFormUniqueEmail, 'backend': 'registration.backends.default.DefaultBackend'}),
                            url(r'^accounts/activate/(?P<activation_key>\w+)/$', 'registration.views.activate', {'success_url': '/accounts/login/?next=/accounts/profile/edit', 'backend': 'registration.backends.default.DefaultBackend'}),                
                            url(r'^accounts/', include('registration.urls')),
                            )