from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^search_genes/'
        r'(?P<genome>[a-zA-Z0-9]+)/(?P<search_string>[a-zA-Z0-9]+)/$',
        views.search_genes),
    url(r'^sequence/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_sequence),
    url(r'^genes/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_genes),
    url(r'^chromlength/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/$',
        views.get_chrom_length),
    url(r'^chromlength/(?P<genome>[a-zA-Z0-9]+)/$', views.get_length),
    url(r'^cytoband/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/$',
        views.get_cytoband),
    url(r'^gc/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_gc),
    url(r'^maptheo/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_maptheo),
    url(r'^mapemp/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_mapemp),
    url(r'^conservation/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_conservation),
    url(r'^gapregion/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        views.get_gapregion),
]
