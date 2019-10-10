'''
Created on May 11, 2012

@author: nils
'''

from django.conf.urls import url
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from rest_framework.routers import DefaultRouter

from constants import UUID_RE

from . import views

urlpatterns = [
    url(r'^import/$', login_required(views.DataSetImportView.as_view()),
        name='import_data_set'),
    # csrf_exempt required for POST requests from external sites
    url(r'^import/isa-tab/$', csrf_exempt(views.ImportISATabView.as_view()),
        name='import_isa_tab'),
    url(r'^import/isa-tab-form/$',
        login_required(views.ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^import/isa-tab-form/(?P<ajax>.+)/$',
        login_required(views.ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^import/metadata-table-form/$',
        login_required(views.ProcessMetadataTableView.as_view()),
        name='process_metadata_table'),
    url(r'^import/check_files/$', views.CheckDataFilesView.as_view(),
        name='check_files'),
    url(r'^import/chunked-upload/$',
        login_required(views.ChunkedFileUploadView.as_view()),
        name='api_chunked_upload'),
    url(r'^import/chunked-upload-complete/$',
        login_required(views.ChunkedFileUploadCompleteView.as_view()),
        name='api_chunked_upload_complete'),
    url(r'^import/take_ownership/$',
        login_required(views.TakeOwnershipOfPublicDatasetView.as_view()),
        name='take_ownership_of_public_dataset')
]

router = DefaultRouter()
router.register(r'nodes', views.NodeViewSet, 'nodes')

data_set_manager_api_urls = router.urls + [
    url(r'^assays/$', views.AssayAPIView.as_view()),
    url(r'^assays/(?P<uuid>' + UUID_RE + ')/files/$',
        views.AssayFileAPIView.as_view()),
    url(r'^assays/(?P<uuid>' + UUID_RE + ')/attributes/$',
        views.AssayAttributeAPIView.as_view()),
    url(r'^data_set_manager/add-file/$', views.AddFileToNodeView.as_view()),
    url(r'^studies/$', views.StudyAPIView.as_view()),
]
