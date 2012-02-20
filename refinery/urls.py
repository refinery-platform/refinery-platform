from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

#patterns for all of the different applications
urlpatterns = patterns('',
    #links in galaxy_connector urls 
    url(r'^galaxy_connector/', include('galaxy_connector.urls')),
    
    #links in isa_tab urls
    url(r'^isa_tab/', include('isa_tab.urls')),
    
    # Examples:
    # url(r'^$', 'refinery.views.home', name='home'),
    # url(r'^refinery/', include('refinery.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),


    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)


