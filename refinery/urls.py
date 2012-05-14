from django.conf.urls.defaults import patterns, include, url
from core.views import admin_test_data
from workflow_manager.views import import_workflows
from tastypie.api import Api
from core.api import ProjectResource


# Uncomment the next two lines to enable the admin:
from django.contrib import admin
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
    
    #links in refinery_repository urls
    url(r'^refinery_repository/', include('refinery_repository.urls')),
    
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
    (r'^api/', include(v1_api.urls)),
)


