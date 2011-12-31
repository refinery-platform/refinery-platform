from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^galaxy_connector/$', 'galaxy_connector.views.index'),
    url(r'^galaxy_connector/(?P<api_key>[a-z0-9]+)/$', 'galaxy_connector.views.api'),
    url(r'^galaxy_connector/(?P<api_key>[a-z0-9]+)/history$', 'galaxy_connector.views.history'),
    
    # Examples:
    # url(r'^$', 'refinery.views.home', name='home'),
    # url(r'^refinery/', include('refinery.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),


    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)


