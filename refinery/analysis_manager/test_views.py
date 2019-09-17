import json

from django.test import RequestFactory

import mock

from analysis_manager.models import AnalysisStatus
from analysis_manager.tests import AnalysisManagerTestBase
from analysis_manager.views import analysis_status
from core.models import Analysis


class AnalysisViewsTests(AnalysisManagerTestBase):
    """
    Tests for `analysis_manager.views`
    """
    def setUp(self):
        super(AnalysisViewsTests, self).setUp()
        self.request_factory = RequestFactory()
        self.status_url_root = "/analysis_manager/{}/".format(
            self.analysis.uuid
        )

    @mock.patch.object(AnalysisStatus,
                       "refinery_import_state",
                       return_value="SUCCESS")
    def test_analysis_calls_refinery_import_state(
            self,
            refinery_import_state_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
        )
        request.user = self.user
        analysis_status(request, self.analysis.uuid)
        self.assertTrue(refinery_import_state_mock.called)

    @mock.patch.object(AnalysisStatus,
                       "galaxy_analysis_state",
                       return_value="SUCCESS")
    def test_analysis_calls_galaxy_analysis_state(
            self,
            galaxy_analysis_state_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
        )
        request.user = self.user
        analysis_status(request, self.analysis.uuid)
        self.assertTrue(galaxy_analysis_state_mock.called)

    @mock.patch.object(AnalysisStatus,
                       "galaxy_export_state",
                       return_value="SUCCESS")
    def test_analysis_calls_galaxy_export_state(
            self,
            galaxy_export_state_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
        )
        request.user = self.user
        analysis_status(request, self.analysis.uuid)
        self.assertTrue(galaxy_export_state_mock.called)

    @mock.patch.object(Analysis,
                       "get_status",
                       return_value="SUCCESS")
    def test_analysis_calls_get_status(
            self,
            get_status_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
        )
        request.user = self.user
        analysis_status(request, self.analysis.uuid)
        self.assertTrue(get_status_mock.called)

    @mock.patch.object(AnalysisStatus,
                       "galaxy_file_import_state",
                       return_value="SUCCESS")
    def test_analysis_calls_galaxy_file_import(
            self,
            galaxy_file_import_state_mock
    ):
        request = self.request_factory.get(self.status_url_root,
                                           content_type="application/json")
        request.user = self.user
        analysis_status(request, self.analysis.uuid)
        self.assertTrue(galaxy_file_import_state_mock.called)

    @mock.patch.object(AnalysisStatus,
                       "galaxy_file_import_state",
                       return_value="SUCCESS")
    def test_analysis_returns_galaxy_file_import_state(
            self,
            get_status_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
        )
        request.user = self.user
        response = analysis_status(request, self.analysis.uuid)

        self.assertEqual(
            json.loads(response.content.decode()),
            {
                "galaxyAnalysis": [],
                "refineryImport": [],
                "galaxyImport": "SUCCESS",
                "overall": "INITIALIZED",
                "galaxyExport": []
            }
        )
