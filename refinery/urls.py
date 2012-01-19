from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^galaxy_connector/$', 'galaxy_connector.views.index'),
    #url(r'^galaxy_connector/(?P<api_key>[a-z0-9]+)/$', 'galaxy_connector.views.api'),
    #url(r'^galaxy_connector/(?P<api_key>[a-z0-9]+)/history$', 'galaxy_connector.views.history'),
    url(r'^galaxy_connector/libraries/$', 'galaxy_connector.views.libraries'),
    url(r'^galaxy_connector/histories/$', 'galaxy_connector.views.histories'),
    url(r'^galaxy_connector/histories/(?P<history_id>[a-z0-9]+)/$', 'galaxy_connector.views.history'),
    url(r'^galaxy_connector/histories/(?P<history_id>[a-z0-9]+)/contents/(?P<content_id>[a-z0-9]+)/$', 'galaxy_connector.views.history_content'),
    url(r'^galaxy_connector/workflows/$', 'galaxy_connector.views.workflows'),
    url(r'^galaxy_connector/run/$', 'galaxy_connector.views.run'),

    url(r'^galaxy_connector/login/$', 'galaxy_connector.views.obtain_instance'),
    url(r'^galaxy_connector/logout/$', 'galaxy_connector.views.release_instance'),

    
    # Examples:
    # url(r'^$', 'refinery.views.home', name='home'),
    # url(r'^refinery/', include('refinery.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),


    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)


