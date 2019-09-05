import uuid

from django.conf import settings

from bioblend.galaxy.client import ConnectionError
from bioblend.galaxy.histories import HistoryClient
from bioblend.galaxy.libraries import LibraryClient
import mock

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import (
    _check_galaxy_history_state, _get_analysis, _get_analysis_status,
    run_analysis
)
from core.models import Analysis

from tests import AnalysisManagerTestBase


# tasks
class AnalysisRunTests(AnalysisManagerTestBase):
    tasks_mock = "analysis_manager.tasks"
    GALAXY_ID_MOCK = "6fc9fbb81c497f69"

    def test_file_import_task_termination_on_analysis_failure(self):
        with mock.patch(
            "core.models.Analysis.terminate_file_import_tasks"
        ) as terminate_mock:
            self.analysis.set_status(Analysis.FAILURE_STATUS)
            run_analysis(self.analysis.uuid)
            self.assertTrue(terminate_mock.called)

    @mock.patch.object(Analysis, "galaxy_progress", side_effect=RuntimeError)
    @mock.patch("analysis_manager.tasks.get_taskset_result")
    @mock.patch("core.models.Analysis.send_email")
    @mock.patch("core.models.Analysis.galaxy_cleanup")
    def test__check_galaxy_history_state_with_runtime_error(
            self,
            galaxy_cleanup_mock,
            send_email_mock,
            get_taskset_result_mock,
            galaxy_progress_mock
    ):
        _check_galaxy_history_state(self.analysis.uuid)

        # Fetch analysis & analysis status since they have changed during
        # the course of this test and the old `self` references are stale
        analysis = Analysis.objects.get(uuid=self.analysis.uuid)
        analysis_status = AnalysisStatus.objects.get(analysis=analysis)

        self.assertEqual(
            analysis_status.galaxy_history_state,
            AnalysisStatus.ERROR
        )
        self.assertEqual(analysis.status, Analysis.FAILURE_STATUS)

        self.assertTrue(galaxy_progress_mock.called)
        self.assertTrue(get_taskset_result_mock.called)
        self.assertTrue(send_email_mock.called)
        self.assertTrue(galaxy_cleanup_mock.called)

    @mock.patch.object(LibraryClient, "delete_library")
    @mock.patch.object(HistoryClient, "delete_history")
    def test_galaxy_cleanup_methods_are_called_on_analysis_failure(
            self,
            delete_history_mock,
            delete_library_mock
    ):
        settings.REFINERY_GALAXY_ANALYSIS_CLEANUP = "always"

        self.analysis.workflow_galaxy_id = self.GALAXY_ID_MOCK
        self.analysis.history_id = self.GALAXY_ID_MOCK
        self.analysis.library_id = self.GALAXY_ID_MOCK
        self.analysis.save()

        self.analysis.cancel()

        self.assertEqual(self.analysis.status, Analysis.FAILURE_STATUS)
        self.assertTrue(self.analysis.canceled)

        self.assertTrue(delete_history_mock.called)
        self.assertTrue(delete_library_mock.called)

        self.assertEqual(delete_history_mock.call_count, 1)

    @mock.patch.object(Analysis, "galaxy_progress",
                       side_effect=ConnectionError("Couldn't establish "
                                                   "Galaxy connection"))
    @mock.patch.object(run_analysis, "retry", side_effect=None)
    def test__check_galaxy_history_state_with_connection_error(
            self,
            retry_mock,
            galaxy_progress_mock
    ):
        _check_galaxy_history_state(self.analysis.uuid)

        # Fetch analysis status since it has changed during
        # the course of this test and the old `self` reference is stale
        analysis_status = AnalysisStatus.objects.get(analysis=self.analysis)

        self.assertEqual(analysis_status.galaxy_history_state,
                         AnalysisStatus.UNKNOWN)

        self.assertTrue(galaxy_progress_mock.called)
        self.assertTrue(retry_mock.called)

    @mock.patch.object(Analysis, "galaxy_progress", return_value=50)
    @mock.patch.object(run_analysis, "retry", side_effect=None)
    def test__check_galaxy_history_state_progress_less_than_percent_complete(
            self,
            retry_mock,
            galaxy_progress_mock
    ):
        self.analysis_status.galaxy_history_progress = 25
        _check_galaxy_history_state(self.analysis.uuid)

        analysis_status = AnalysisStatus.objects.get(analysis=self.analysis)

        self.assertEqual(analysis_status.galaxy_history_progress, 50)
        self.assertEqual(analysis_status.galaxy_history_state,
                         AnalysisStatus.PROGRESS)

        self.assertTrue(galaxy_progress_mock.called)
        self.assertTrue(retry_mock.called)

    @mock.patch.object(Analysis, "galaxy_progress", return_value=100)
    def test__check_galaxy_history_state_percent_complete_is_100(
            self,
            galaxy_progress_mock
    ):
        self.analysis_status.galaxy_history_progress = 100
        _check_galaxy_history_state(self.analysis.uuid)

        analysis_status = AnalysisStatus.objects.get(analysis=self.analysis)

        self.assertEqual(analysis_status.galaxy_history_state,
                         AnalysisStatus.OK)

        self.assertTrue(galaxy_progress_mock.called)

    @mock.patch.object(run_analysis, "update_state")
    def test__get_analysis_bad_uuid(self, update_state_mock):
        self.assertEqual(_get_analysis(str(uuid.uuid4())), None)
        self.assertTrue(update_state_mock.called)

    @mock.patch.object(run_analysis, "update_state")
    def test__get_analysis_status_bad_uuid(self, update_state_mock):
        self.analysis_status.delete()
        self.assertEqual(_get_analysis_status(self.analysis.uuid), None)
        self.assertTrue(update_state_mock.called)
