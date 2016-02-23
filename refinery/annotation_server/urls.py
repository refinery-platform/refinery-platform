from django.conf.urls import patterns, url

urlpatterns = patterns(
    'annotation_server.views',
    url(r'^search_genes/'
        r'(?P<genome>[a-zA-Z0-9]+)/(?P<search_string>[a-zA-Z0-9]+)/$',
        'search_genes'),
    url(r'^sequence/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_sequence'),
    url(r'^genes/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_genes'),
    url(r'^chromlength/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/$',
        'get_chrom_length'),
    url(r'^chromlength/(?P<genome>[a-zA-Z0-9]+)/$', 'get_length'),
    url(r'^cytoband/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/$',
        'get_cytoband'),
    url(r'^gc/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_gc'),
    url(r'^maptheo/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_maptheo'),
    url(r'^mapemp/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_mapemp'),
    url(r'^conservation/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_conservation'),
    url(r'^gapregion/(?P<genome>[a-zA-Z0-9]+)/(?P<chrom>[a-zA-Z0-9]+)/'
        r'(?P<start>[0-9]+)/(?P<end>[0-9]+)/$',
        'get_gapregion'),
)
