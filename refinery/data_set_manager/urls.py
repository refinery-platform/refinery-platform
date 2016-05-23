'''
Created on May 11, 2012

@author: nils
'''

from django.conf.urls import patterns, url
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from data_set_manager.views import (
    DataSetImportView, ImportISATabView, ProcessISATabView,
    ProcessMetadataTableView, CheckDataFilesView, ChunkedFileUploadView,
    ChunkedFileUploadCompleteView, TakeOwnershipOfPublicDatasetView)


urlpatterns = patterns(
    'data_set_manager.views',
    url(r'^import/$', login_required(DataSetImportView.as_view()),
        name='import_data_set'),
    # csrf_exempt required for POST requests from external sites
    url(r'^import/isa-tab/$', csrf_exempt(ImportISATabView.as_view()),
        name='import_isa_tab'),
    url(r'^import/isa-tab-form/$',
        login_required(ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^import/isa-tab-form/(?P<ajax>.+)/$',
        login_required(ProcessISATabView.as_view()),
        name='process_isa_tab'),
    url(r'^import/metadata-table-form/$',
        login_required(ProcessMetadataTableView.as_view()),
        name='process_metadata_table'),
    url(r'^import/check_files/$', CheckDataFilesView.as_view(),
        name='check_files'),
    url(r'^import/chunked-upload/$',
        login_required(ChunkedFileUploadView.as_view()),
        name='api_chunked_upload'),
    url(r'^import/chunked-upload-complete/$',
        login_required(ChunkedFileUploadCompleteView.as_view()),
        name='api_chunked_upload_complete'),
    url(r'^import/take_ownership/$',
        TakeOwnershipOfPublicDatasetView.as_view(),
        name='take_ownership_of_public_dataset'),

)
