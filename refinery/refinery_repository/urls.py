#isatab pages
from django.conf.urls.defaults import patterns, include, url
from django.views.generic import DetailView, ListView
from refinery_repository.models import Investigation

urlpatterns = patterns('refinery_repository.views',
#    url(r'^$', 'index'),
    url(r'^(?P<accession>.*\d+)/$', 'detail'),
    url(r'^(?P<accession>.*\d+)/results/$', 'results'),
    url(r'^(?P<accession>.*\d+)/download/$', 'download'),
    url(r'samples/$', 'get_available_files'),
    url(r'^cancelled/$', 'cancelled')
)

urlpatterns += patterns('',
    url(r'^$',
        ListView.as_view(
            queryset=Investigation.objects.all(),
            context_object_name='investigations',
            paginate_by=5,
            template_name='refinery_repository/index.html'
        ))
                        
)
