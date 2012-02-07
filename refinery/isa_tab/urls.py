#isatab pages
from django.conf.urls.defaults import patterns, include, url

urlpatterns = patterns('isa_tab.views',
    url(r'^$', 'index'),
    url(r'^(?P<accession>E-[A-Z]+-\d+)/$', 'detail'),
    url(r'^(?P<accession>E-[A-Z]+-\d+)/results/$', 'results'),
    url(r'^(?P<accession>E-[A-Z]+-\d+)/download/$', 'download')
)