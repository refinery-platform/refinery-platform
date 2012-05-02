from django.conf.urls.defaults import patterns, url

urlpatterns = patterns('annotation_server.views',                  
    url(r'^search_genes/(?P<search_string>[a-zA-Z0-9]+)/$', 'search_genes' ),
    url(r'^get_sequence/(?P<chrom>[a-zA-Z0-9]+)/(?P<start>[0-9]+)/(?P<end>[0-9]+)/$', 'get_sequence' ),
    url(r'^get_genes/(?P<chrom>[a-zA-Z0-9]+)/(?P<start>[0-9]+)/(?P<end>[0-9]+)/$', 'get_genes' ),
    url(r'^get_exons/(?P<chrom>[a-zA-Z0-9]+)/(?P<start>[0-9]+)/(?P<end>[0-9]+)/$', 'get_exons' ),
    url(r'^get_chrom_length/(?P<chrom>[a-zA-Z0-9]+)/$', 'get_chrom_length' ),
    url(r'^get_cytoband/(?P<chrom>[a-zA-Z0-9]+)/$', 'get_cytoband' ),
)