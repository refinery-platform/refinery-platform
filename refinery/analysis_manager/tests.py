import json
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.test import RequestFactory, TestCase

from bioblend.galaxy.client import ConnectionError
from bioblend.galaxy.histories import HistoryClient
from bioblend.galaxy.libraries import LibraryClient
from guardian.utils import get_anonymous_user
import mock

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import (
    _check_galaxy_history_state, _get_analysis, _get_analysis_status,
    run_analysis
)
from analysis_manager.utils import (
    fetch_objects_required_for_analysis, validate_analysis_config
)
from analysis_manager.views import analysis_status
from core.models import Analysis, Project, Workflow, WorkflowEngine
from data_set_manager.models import Assay
from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import (
    create_dataset_with_necessary_models, make_analyses_with_single_dataset
)


class AnalysisManagerTestBase(TestCase):
    def setUp(self):
        self.username = 'coffee_tester'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

        analyses, self.dataset = make_analyses_with_single_dataset(
            1,
            self.user
        )

        self.analysis = analyses[0]
        self.analysis_status = AnalysisStatus.objects.get(
            analysis=self.analysis
        )


class AnalysisConfigTests(TestCase):
    def generate_analysis_config(self,
                                 missing_a_field=False,
                                 valid_analysis_type_uuid=True,
                                 valid_name=True,
                                 valid_study_uuid=True,
                                 valid_user_id=True,
                                 valid_workflow_uuid=True):
        analysis_config = {}
        analysis_type_uuid = (
            str(uuid.uuid4()) if valid_analysis_type_uuid else ""
        )
        analysis_config["tool_uuid"] = analysis_type_uuid

        analysis_config["name"] = (
            "Valid Custom Name" if valid_name else []
        )
        analysis_config["study_uuid"] = (
            str(uuid.uuid4()) if valid_study_uuid else ""
        )

        analysis_config["user_id"] = 1 if valid_user_id else ""

        analysis_config["workflow_uuid"] = (
            str(uuid.uuid4()) if valid_workflow_uuid else ""
        )

        if missing_a_field:
            del analysis_config["user_id"]

        return analysis_config

    def test_valid_tool_analysis_config(self):
        # Not asserting anything here because if later down the line
        # `validate_analysis_config()` changes and raises some new Exception
        # it could fall through the cracks
        validate_analysis_config(self.generate_analysis_config())

    def test_invalid_tool_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(missing_a_field=True)
            )

    def test_invalid_tool_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(valid_analysis_type_uuid=False)
            )

    def test_invalid_tool_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(valid_user_id=False)
            )


class AnalysisUtilsTests(TestCase):
    """
    Test that the proper analysis creation methods are called from the 3
    different types of valid analysis configs
    """
    def setUp(self):
        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            is_active=True,
            workflow_engine=self.workflow_engine
        )
        self.user = get_anonymous_user()
        project = Project.objects.create(
            name="Catch-All Project",
            is_catch_all=True
        )
        project.set_owner(self.user)
        self.user.profile.catch_all_project = project
        self.user.profile.save()

        self.dataset = create_dataset_with_necessary_models()
        self.study = self.dataset.get_latest_study()
        self.assay = Assay.objects.create(study=self.study)

    def test_fetch_objects_required_for_analyses(self):
        self.assertEqual(
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": self.study.uuid,
                    "user_id": self.user.id,
                    "workflow_uuid": self.workflow.uuid
                }
            ),
            {
                "user": self.user,
                "current_workflow": self.workflow,
                "data_set": self.dataset,
            }
        )

    def test_fetch_objects_required_for_analyses_bad_workflow(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": self.study.uuid,
                    "user_id": self.user.id,
                    "workflow_uuid": "COFFEE"
                }
            )
            self.assertIn("Couldn't fetch Workflow", context.exception.message)

    def test_fetch_objects_required_for_analyses_bad_study(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": "COFFEE",
                    "user_id": self.user.id,
                    "workflow_uuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch Study", context.exception.message)

    def test_fetch_objects_required_for_analyses_bad_user(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": self.study.uuid,
                    "user_id": 400,
                    "workflow_uuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch User", context.exception.message)


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
            json.loads(response.content),
            {
                "galaxyAnalysis": [],
                "refineryImport": [],
                "galaxyImport": "SUCCESS",
                "overall": "INITIALIZED",
                "galaxyExport": []
            }
        )


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


class AnalysisStatusTests(AnalysisManagerTestBase):
    def test_set_galaxy_history_state_with_valid_state(self):
        self.analysis_status.set_galaxy_history_state(AnalysisStatus.PROGRESS)
        self.assertEqual(
            self.analysis_status.galaxy_history_state,
            AnalysisStatus.PROGRESS
        )

    def test_set_galaxy_history_state_with_invalid_state(self):
        with self.assertRaises(ValueError) as context:
            self.analysis_status.set_galaxy_history_state("NOT A VALID STATE")
            self.assertEqual(
                context.exception.message,
                "Invalid Galaxy history state given"
            )

    def test_set_galaxy_import_state_with_valid_state(self):
        self.analysis_status.set_galaxy_import_state(AnalysisStatus.PROGRESS)
        self.assertEqual(
            self.analysis_status.galaxy_import_state,
            AnalysisStatus.PROGRESS
        )

    def test_set_galaxy_import_state_with_invalid_state(self):
        with self.assertRaises(ValueError) as context:
            self.analysis_status.set_galaxy_import_state("NOT A VALID STATE")
            self.assertEqual(
                context.exception.message,
                "Invalid Galaxy history state given"
            )

    def test_set_galaxy_import_task_group_id(self):
        test_uuid = str(uuid.uuid4())
        self.analysis_status.set_galaxy_import_task_group_id(test_uuid)
        self.assertEqual(
            self.analysis_status.galaxy_import_task_group_id,
            test_uuid
        )
