#isatab pages
from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('core.views',
    url(r'^$', 'index'),
    url(r'^user/(?P<query>[a-z0-9]+)/$', 'user'),
    # "name" is required for use with the url tag in templates
    url(r'^user/(?P<query>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'user', name="user"),
    url(r'^project/(?P<uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'project', name="project"),
)