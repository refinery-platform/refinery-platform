from core.api import ProjectResource
from core.models import DataSet
from core.views import admin_test_data
from data_set_manager.views import search_typeahead
<<<<<<< HEAD
=======
from core.views import solr
>>>>>>> 364d16d401b820e8c71632a16caab1f1d62e90b9
from django.conf.urls.defaults import patterns, include, url
from django.contrib import admin
from haystack.forms import FacetedSearchForm
from haystack.query import SearchQuerySet
from haystack.views import FacetedSearchView
from tastypie.api import Api
from workflow_manager.views import import_workflows


# NG: facets for Haystack
sqs = SearchQuerySet().using( "core" ).models( DataSet ).facet('measurement').facet('technology').highlight()


# Uncomment the next two lines to enable the admin:
admin.autodiscover()

# NG: added for tastypie URL
v1_api = Api(api_name='v1')
v1_api.register(ProjectResource())

#patterns for all of the different applications
urlpatterns = patterns('',    
    #links in core urls
    url(r'^', include('core.urls')),

    url(r'^annotation_server/', include('annotation_server.urls')),
    url(r'^workflow_manager/', include('workflow_manager.urls')),
    url(r'^analysis_manager/', include('analysis_manager.urls')),
    url(r'^data_set_manager/', include('data_set_manager.urls')),
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
    url(r"^admin/core/test_workflows/$", admin.site.admin_view( import_workflows ) ),    
    url(r"^admin/core/test_data/$", admin.site.admin_view( admin_test_data ) ),    
    url(r'^admin/', include(admin.site.urls)),
    
    url(r'^login/$', 'django.contrib.auth.views.login' ),
    url(r'^accounts/login/$', 'django.contrib.auth.views.login' ),
    url(r'^logout/$', 'django.contrib.auth.views.logout', { "next_page":"/" } ),
    
    # NG: tastypie API urls
    url(r'^api/', include(v1_api.urls)),
    
    # NG: Haystack (searching and querying) urls
    #url(r'^search/', include('haystack.urls')),
    url(r'^search/', FacetedSearchView(form_class=FacetedSearchForm, searchqueryset=sqs), name='search' ),
    url(r'^typeahead/$', search_typeahead),
<<<<<<< HEAD
=======
    #url(r'^solr/(?P<query>.+/$)', solr ),
    url(r'^solr/$', solr ),
>>>>>>> 364d16d401b820e8c71632a16caab1f1d62e90b9
)
