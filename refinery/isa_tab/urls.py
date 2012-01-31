#isa_tab pages
from django.conf.urls.defaults import patterns, include, url

urlpatterns = patterns('isa_tab.views',
    url(r'^$', 'index'),
    url(r'^(?P<accession>E-[A-Z]+-\d+)/$', 'detail')
)