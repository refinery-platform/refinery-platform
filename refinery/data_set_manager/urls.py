'''
Created on May 11, 2012

@author: nils
'''

from django.conf.urls.defaults import patterns, url
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from data_set_manager.views import ImportISATabView, ProcessISATabView


urlpatterns = patterns('data_set_manager.views',
    url(r'^$', 'index', name="data_set_manager_base" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types/$', "node_types", name="data_set_manager_node_types" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types/$', "node_types", name="data_set_manager_node_types" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types_files/$', "node_types_files", name="data_set_manager_node_types_files" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/types_files/$', "node_types_files", name="data_set_manager_node_types_files" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/attributes/(?P<type>[\w ]+)/$', "node_attributes", name="data_set_manager_node_attributes" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/attributes/(?P<type>[\w ]+)/$', "node_attributes", name="data_set_manager_node_attributes" ),
    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<type>[\w ]+)/$', "nodes", name="data_set_manager_nodes" ),

    url(r'^nodes/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<type>[\w ]+)/annotate$', "node_annotate", name="data_set_manager_update_annotated_nodes" ),
    
    url(r'^import/isa-tab/$', csrf_exempt(ImportISATabView.as_view()),
        name='import_isa_tab'),
    url(r'^import/isa-tab-form/$', login_required(ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^contents/(?P<study_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/(?P<assay_uuid>[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/$', "contents", name="data_set_manager_contents" ),
)
