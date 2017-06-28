import json
import uuid

import mock
from django.contrib.auth.models import User
from django.http import HttpResponseBadRequest, HttpResponseNotAllowed
from django.test import RequestFactory, TestCase
from guardian.utils import get_anonymous_user

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import AnalysisRunner
from analysis_manager.utils import (create_analysis,
                                    fetch_objects_required_for_analysis,
                                    validate_analysis_config)
from analysis_manager.views import run
from core.models import Analysis, DataSet, Workflow, WorkflowEngine
from factory_boy.utils import (create_dataset_with_necessary_models,
                               make_analyses_with_single_dataset)
from galaxy_connector.models import Instance


class AnalysisConfigTests(TestCase):
    """
    Test for validation of the two legacy ways of launching Analyses (
    using NodeSets and NodeRelationships) as well as for the new Tool-based
    approach
    """

    def generate_analysis_config(self,
                                 analysis_type,
                                 missing_a_field=False,
                                 valid_analysis_type_uuid=True,
                                 valid_custom_name=True,
                                 valid_study_uuid=True,
                                 valid_user_id=True,
                                 valid_workflow_uuid=True):
        analysis_config = {}
        valid_analysis_types = ["NodeSet", "NodeRelationship", "Tool"]

        assert analysis_type in valid_analysis_types, \
            "Not a valid analysis_type. {} not in {}".format(
                analysis_type,
                valid_analysis_types
            )

        analysis_type_uuid = (
            str(uuid.uuid4()) if valid_analysis_type_uuid else ""
        )

        if analysis_type == "NodeSet":
            analysis_config["nodeSetUuid"] = analysis_type_uuid

        if analysis_type == "NodeRelationship":
            analysis_config["nodeRelationshipUuid"] = analysis_type_uuid

        if analysis_type == "Tool":
            analysis_config["toolUuid"] = analysis_type_uuid

        analysis_config["custom_name"] = (
            "Valid Custom Name" if valid_custom_name else []
        )

        analysis_config["studyUuid"] = (
            str(uuid.uuid4()) if valid_study_uuid else ""
        )

        analysis_config["user_id"] = 1 if valid_user_id else ""

        analysis_config["workflowUuid"] = (
            str(uuid.uuid4()) if valid_workflow_uuid else ""
        )

        if missing_a_field:
            del analysis_config["user_id"]

        return analysis_config

    def test_valid_nodeset_analysis_config(self):
        # Not asserting anything here because if later down the line
        # `validate_analysis_config()` changes and raises some new Exception
        # it could fall through the cracks
        validate_analysis_config(
            self.generate_analysis_config(analysis_type="NodeSet")
        )

    def test_invalid_nodeset_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeSet",
                    missing_a_field=True
                )
            )

    def test_invalid_nodeset_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeSet",
                    valid_study_uuid=False
                )
            )

    def test_invalid_nodeset_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeSet",
                    valid_user_id=False
                )
            )

    def test_valid_noderelationship_analysis_config(self):
        # Not asserting anything here because if later down the line
        # `validate_analysis_config()` changes and raises some new Exception
        # it could fall through the cracks
        validate_analysis_config(
            self.generate_analysis_config(
                analysis_type="NodeRelationship"
            )
        )

    def test_invalid_noderelationship_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeRelationship",
                    missing_a_field=True
                )
            )

    def test_invalid_noderelationship_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeRelationship",
                    valid_workflow_uuid=False
                )
            )

    def test_invalid_noderelationship_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="NodeRelationship",
                    valid_user_id=False
                )
            )

    def test_valid_tool_analysis_config(self):
        # Not asserting anything here because if later down the line
        # `validate_analysis_config()` changes and raises some new Exception
        # it could fall through the cracks
        validate_analysis_config(
            self.generate_analysis_config(analysis_type="Tool")
        )

    def test_invalid_tool_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="Tool",
                    missing_a_field=True
                )
            )

    def test_invalid_tool_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="Tool",
                    valid_analysis_type_uuid=False
                )
            )

    def test_invalid_tool_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                self.generate_analysis_config(
                    analysis_type="Tool",
                    valid_user_id=False
                )
            )


class AnalysisUtilsTests(TestCase):
    """
    Test that the proper analysis creation methods are called from the 3
    different types of valid analysis configs
    """
    def setUp(self):
        self.galaxy_instance = Instance.objects.create()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            is_active=True,
            workflow_engine=self.workflow_engine
        )
        self.user = get_anonymous_user()

        self.dataset = create_dataset_with_necessary_models()
        self.study = self.dataset.get_latest_study()

    def test_create_nodeset_analysis(self):
        with mock.patch(
            "analysis_manager.utils.create_nodeset_analysis"
        ) as create_nodeset_analysis_mock:
            create_analysis(
                {
                    "custom_name": "Valid NodeSet Analysis Config",
                    "studyUuid": self.study.uuid,
                    "nodeSetUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_nodeset_analysis_mock.called)

    def test_create_noderelationship_analysis(self):
        with mock.patch(
                "analysis_manager.utils.create_noderelationship_analysis"
        ) as create_noderelationship_analysis_mock:
            create_analysis(
                {
                    "custom_name": "Valid NodeRelationship Analysis Config",
                    "studyUuid": self.study.uuid,
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_noderelationship_analysis_mock.called)

    def test_create_tool_analysis(self):
        with mock.patch(
            "tool_manager.utils.create_tool_analysis"
        ) as create_tool_analysis_mock:
            create_analysis(
                {
                    "custom_name": "Valid Tool Analysis Config",
                    "studyUuid": self.study.uuid,
                    "toolUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_tool_analysis_mock.called)

    def test_fetch_objects_required_for_analyses(self):
        self.assertEqual(
            fetch_objects_required_for_analysis(
                {
                    "studyUuid": self.study.uuid,
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
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
                    "studyUuid": self.study.uuid,
                    "user_id": self.user.id,
                    "workflowUuid": "COFFEE"
                }
            )
            self.assertIn("Couldn't fetch Workflow", context.exception.message)

    def test_fetch_objects_required_for_analyses_bad_study(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "studyUuid": "COFFEE",
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch Study", context.exception.message)

    def test_fetch_objects_required_for_analyses_bad_user(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "studyUuid": self.study.uuid,
                    "user_id": 400,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch User", context.exception.message)

    def test_fetch_objects_required_for_analyses_bad_dataset(self):
        self.dataset.delete()
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "studyUuid": self.study.uuid,
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch DataSet", context.exception.message)


class AnalysisRunViewTests(TestCase):
    """
    Test `analysis_manager.views.run`
    """
    def setUp(self):
        self.request_factory = RequestFactory()
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.user.id = 1
        make_analyses_with_single_dataset(1, self.user)
        self.analysis = Analysis.objects.all()[0]
        self.view_root = "/analysis_manager/run/"

    def test_analysis_run_view_invalid_http_verbs(self):
        # GET PUT PATCH DELETE etc.
        response = self.client.get(
            self.view_root,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.delete(
            self.view_root,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.put(
            self.view_root,
            data={
                "custom_name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "user_id": 1,
                "workflowUuid": str(uuid.uuid4())
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.patch(
            self.view_root,
            data={
                "custom_name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "workflowUuid": str(uuid.uuid4())
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

    def test_analysis_run_view_valid_data(self):
        with mock.patch(
            "analysis_manager.views.create_analysis",
            return_value=self.analysis
        ) as create_analysis_mock:
            request = self.request_factory.post(
                self.view_root,
                json.dumps({
                    "custom_name": "Valid Tool Analysis Config",
                    "studyUuid": str(uuid.uuid4()),
                    "toolUuid": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }),
                content_type="application/json",
                HTTP_X_REQUESTED_WITH='XMLHttpRequest'
            )
            request.user = self.user
            with mock.patch.object(
                    AnalysisRunner.run_analysis, 'delay', side_effect=None
            ) as task_mock:
                response = run(request)
                self.assertTrue(task_mock.called)

            self.assertEqual(
                response.content,
                "/analysis_manager/{}/".format(self.analysis.uuid)
            )
            self.assertTrue(create_analysis_mock.called)

    def test_analysis_run_view_invalid_data(self):
        response = self.client.post(
            self.view_root,
            data=json.dumps({
                "custom_name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "workflowUuid": str(uuid.uuid4())
            }),
            content_type="application/json",
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseBadRequest)

    def test_analysis_view_non_ajax_request(self):
        response = self.client.post(
            self.view_root,
            data={
                "custom_name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "workflowUuid": str(uuid.uuid4())
            }
        )
        self.assertEqual(type(response), HttpResponseBadRequest)


class AnalysisRunnerTests(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

        make_analyses_with_single_dataset(1, self.user)

        self.analysis = Analysis.objects.all()[0]
        AnalysisStatus.objects.create(analysis=self.analysis)

        self.dataset = DataSet.objects.all()[0]

    @mock.patch.object(AnalysisRunner.run_analysis, 'delay', side_effect=None)
    def test_analysis_runner_instantiation(self, task_mock):
        a = AnalysisRunner(self.analysis.uuid)

        self.assertEqual(self.analysis, a.analysis)
        self.assertTrue(task_mock.called)

    @mock.patch("analysis_manager.tasks.AnalysisRunner._refinery_file_import")
    @mock.patch("analysis_manager.tasks.AnalysisRunner._run_galaxy_workflow")
    @mock.patch("analysis_manager.tasks.AnalysisRunner._galaxy_file_import")
    @mock.patch("analysis_manager.tasks.AnalysisRunner._galaxy_file_export")
    @mock.patch(
        "analysis_manager.tasks.AnalysisRunner._attach_workflow_outputs"
    )
    def test_run_analysis(self,
                          refinery_import_mock,
                          run_galaxy_mock,
                          galaxy_import_mock,
                          galaxy_export_mock,
                          attach_outputs_mock):
        # Run an Analysis and ensure that the methods to check the state of
        # the tsk get called properly
        with mock.patch.object(
                AnalysisRunner.run_analysis, 'delay', side_effect=None):

            AnalysisRunner.run_analysis(
                AnalysisRunner(self.analysis.uuid),
                self.analysis.uuid
            )
            self.assertTrue(refinery_import_mock.called)
            self.assertTrue(run_galaxy_mock.called)
            self.assertTrue(galaxy_import_mock.called)
            self.assertTrue(galaxy_export_mock.called)
            self.assertTrue(attach_outputs_mock.called)
