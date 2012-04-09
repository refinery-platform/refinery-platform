from django.conf.urls.defaults import patterns, include, url
from core.views import admin_test_data
from workflow_manager.views import import_workflows

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

#patterns for all of the different applications
urlpatterns = patterns('',    
    #links in core urls
    url(r'^', include('core.urls')),

    url(r'^workflow_manager/', include('workflow_manager.urls')),

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
    url(r'^logout/$', 'django.contrib.auth.views.logout', { "next_page":"/" } )            
)


