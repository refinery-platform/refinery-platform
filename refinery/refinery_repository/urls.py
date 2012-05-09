#isatab pages
from django.conf.urls.defaults import patterns, include, url
from django.views.generic import DetailView, ListView
from refinery_repository.models import Investigation
from refinery_repository.views import investigations, investigation

urlpatterns = patterns('refinery_repository.views',
#    url(r'^$', 'index'),
    url(r'^samples/$', 'get_available_files'),
    url(r'^cancelled/$', 'cancelled'),
    url(r'^download/$', 'download_selected_samples'),
    url(r'^results/$', 'results_selected'),
    url(r'^investigations/$', investigations, name="investigations" ),    
    url(r'^investigations/(?P<query>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', investigation, name="investigation" ),
    
    url(r'^analysis_samples/$', 'get_available_files2'),
    url(r'^analysis_run/$', 'analysis_run'),
    url(r'^update_workflows/$', 'update_workflows'),
    url(r'^workflow_inputs/(?P<workflow_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', 'getWorkflowDataInputMap'),
    url(r'^(?P<accession>.*\d+)/$', 'detail'),
    url(r'^(?P<accession>.*\d+)/results/$', 'results'),
    url(r'^(?P<accession>.*\d+)/download/$', 'download'),
    url(r'^import/isa-tab/$', 'import_isa_tab'),
    url(r'^import/isa-tab/result/$', 'import_isa_tab_result')
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