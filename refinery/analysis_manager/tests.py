import json
import uuid

from django.contrib.auth.models import User
from django.http import HttpResponseBadRequest, HttpResponseNotAllowed
from django.test import RequestFactory, TestCase

from guardian.utils import get_anonymous_user
import mock

from analysis_manager.models import AnalysisStatus
from analysis_manager.tasks import _refinery_file_import, run_analysis
from analysis_manager.utils import (_fetch_node_relationship, _fetch_node_set,
                                    create_analysis,
                                    fetch_objects_required_for_analysis,
                                    validate_analysis_config)
from analysis_manager.views import analysis_status, run
from core.models import (Analysis, DataSet, NodeRelationship, NodeSet, Project,
                         Workflow, WorkflowEngine)
from data_set_manager.models import Assay
from factory_boy.utils import (create_dataset_with_necessary_models,
                               make_analyses_with_single_dataset)
from galaxy_connector.models import Instance
from tool_manager.models import ToolDefinition
from tool_manager.tests import ToolManagerTestBase


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
                                 valid_name=True,
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

        analysis_config["name"] = (
            "Valid Custom Name" if valid_name else []
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

    def test_create_nodeset_analysis(self):
        with mock.patch(
            "analysis_manager.utils.create_nodeset_analysis"
        ) as create_nodeset_analysis_mock:
            create_analysis(
                {
                    "name": "Valid NodeSet Analysis Config",
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
                    "name": "Valid NodeRelationship Analysis Config",
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
                    "name": "Valid Tool Analysis Config",
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

    def test_create_noderelationship_analysis_with_user_provided_name(self):
        name = "This is a user provided name"
        with mock.patch(
            "analysis_manager.utils._fetch_node_relationship"
        ) as create_noderelationship_analysis_mock:
            analysis = create_analysis(
                {
                    "name": name,
                    "studyUuid": self.study.uuid,
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_noderelationship_analysis_mock.called)
            self.assertEqual(analysis.name, name)

    def test_create_noderelationship_analysis_without_user_provided_name(self):
        name = ""
        with mock.patch(
                "analysis_manager.utils._fetch_node_relationship"
        ) as create_noderelationship_analysis_mock:
            analysis = create_analysis(
                {
                    "name": name,
                    "studyUuid": self.study.uuid,
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_noderelationship_analysis_mock.called)
            self.assertNotEqual(analysis.name, name)

    @mock.patch("analysis_manager.utils._fetch_solr_uuids")
    @mock.patch("analysis_manager.utils._associate_workflow_data_inputs")
    def test_create_nodeset_analysis_with_user_provided_name(
        self, get_solr_uuids_mock, workflow_inputs_mock
    ):
        name = "This is a user provided name"
        with mock.patch(
            "analysis_manager.utils._fetch_node_set"
        ) as create_nodeset_analysis_mock:
            analysis = create_analysis(
                {
                    "name": name,
                    "studyUuid": self.study.uuid,
                    "nodeSetUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_nodeset_analysis_mock.called)
            self.assertEqual(analysis.name, name)
        self.assertTrue(get_solr_uuids_mock.called)
        self.assertTrue(workflow_inputs_mock.called)

    @mock.patch("analysis_manager.utils._fetch_solr_uuids")
    @mock.patch("analysis_manager.utils._associate_workflow_data_inputs")
    def test_create_nodeset_analysis_without_user_provided_name(
        self, get_solr_uuids_mock, workflow_inputs_mock
    ):
        name = ""
        with mock.patch(
            "analysis_manager.utils._fetch_node_set"
        ) as create_noderelationship_analysis_mock:
            analysis = create_analysis(
                {
                    "name": name,
                    "studyUuid": self.study.uuid,
                    "nodeSetUuid": str(uuid.uuid4()),
                    "user_id": self.user.id,
                    "workflowUuid": self.workflow.uuid
                }
            )
            self.assertTrue(create_noderelationship_analysis_mock.called)
            self.assertNotEqual(analysis.name, name)
        self.assertTrue(get_solr_uuids_mock.called)
        self.assertTrue(workflow_inputs_mock.called)

    def test_fetch_nodeset_valid_uuid(self):
        nodeset = NodeSet.objects.create(
            study=self.study,
            assay=self.assay
        )
        self.assertEqual(
            nodeset,
            _fetch_node_set(nodeset.uuid)
        )

    def test_fetch_nodeset_invalid_uuid(self):
        with self.assertRaises(RuntimeError):
            _fetch_node_set(str(uuid.uuid4()))

    def test_fetch_node_relationship_valid_uuid(self):
        node_relationship = NodeRelationship.objects.create(
            study=self.study,
            assay=self.assay
        )
        self.assertEqual(
            node_relationship,
            _fetch_node_relationship(node_relationship.uuid)
        )

    def test_fetch_node_relationship_invalid_uuid(self):
        with self.assertRaises(RuntimeError):
            _fetch_node_relationship(str(uuid.uuid4()))


class AnalysisViewsTests(ToolManagerTestBase):
    """
    Tests for `analysis_manager.views`
    """
    def setUp(self):
        super(AnalysisViewsTests, self).setUp()
        self.request_factory = RequestFactory()
        make_analyses_with_single_dataset(1, self.user)
        self.analysis = Analysis.objects.all()[0]
        AnalysisStatus.objects.create(analysis=self.analysis)

        self.run_url_root = "/analysis_manager/run/"
        self.status_url_root = "/analysis_manager/{}/".format(
            self.analysis.uuid
        )

    def test_analysis_run_view_invalid_http_verbs(self):
        # GET PUT PATCH DELETE etc.
        response = self.client.get(
            self.run_url_root,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.delete(
            self.run_url_root,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.put(
            self.run_url_root,
            data={
                "name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "user_id": 1,
                "workflowUuid": str(uuid.uuid4())
            },
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)

        response = self.client.patch(
            self.run_url_root,
            data={
                "name": "Valid Tool Analysis Config",
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
                self.run_url_root,
                json.dumps({
                    "name": "Valid Tool Analysis Config",
                    "studyUuid": str(uuid.uuid4()),
                    "toolUuid": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }),
                content_type="application/json",
                HTTP_X_REQUESTED_WITH='XMLHttpRequest'
            )
            request.user = self.user
            with mock.patch.object(
                    run_analysis, 'delay', side_effect=None
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
            self.run_url_root,
            data=json.dumps({
                "name": "Valid Tool Analysis Config",
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
            self.run_url_root,
            data={
                "name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "workflowUuid": str(uuid.uuid4())
            }
        )
        self.assertEqual(type(response), HttpResponseBadRequest)

    @mock.patch.object(AnalysisStatus,
                       "galaxy_file_import_state",
                       return_value="coffee")
    def test_non_tool_analysis_calls_old_galaxy_file_import_state(
            self,
            file_import_state_mock
    ):
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        request.user = self.user
        response = analysis_status(request, self.analysis.uuid)
        self.assertTrue(file_import_state_mock.called)

        self.assertEqual(
            json.loads(response.content),
            {
                "galaxyAnalysis": [],
                "refineryImport": [],
                "galaxyImport": "coffee",
                "overall": "INITIALIZED",
                "galaxyExport": []
            }
        )

    @mock.patch.object(AnalysisStatus,
                       "tool_based_galaxy_file_import_state",
                       return_value="coffee")
    def test_tool_analysis_calls_tool_based_galaxy_file_import_state(
            self,
            file_import_state_mock
    ):
        self.create_valid_tool(ToolDefinition.WORKFLOW)
        self.status_url_root = "/analysis_manager/{}/".format(
            self.tool.analysis.uuid
        )
        request = self.request_factory.get(
            self.status_url_root,
            content_type="application/json",
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        request.user = self.user
        response = analysis_status(request, self.tool.analysis.uuid)
        self.assertTrue(file_import_state_mock.called)

        self.assertEqual(
            json.loads(response.content),
            {
                "galaxyAnalysis": [],
                "refineryImport": [],
                "galaxyImport": "coffee",
                "overall": "INITIALIZED",
                "galaxyExport": []
            }
        )


class AnalysisRunTests(TestCase):
    tasks_mock = "analysis_manager.tasks"

    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

        make_analyses_with_single_dataset(1, self.user)

        self.analysis = Analysis.objects.all()[0]
        self.analysis_status = AnalysisStatus.objects.create(
            analysis=self.analysis
        )

        self.dataset = DataSet.objects.all()[0]

    @mock.patch("{}._refinery_file_import".format(tasks_mock))
    @mock.patch("{}._run_galaxy_workflow".format(tasks_mock))
    @mock.patch("{}._galaxy_file_import".format(tasks_mock))
    @mock.patch("{}._galaxy_file_export".format(tasks_mock))
    @mock.patch("{}._attach_workflow_outputs".format(tasks_mock))
    def test_run_analysis(self,
                          refinery_import_mock,
                          run_galaxy_mock,
                          galaxy_import_mock,
                          galaxy_export_mock,
                          attach_outputs_mock):
        # Run an Analysis and ensure that the methods to check the state of
        # the tsk get called properly
        run_analysis(self.analysis.uuid)
        self.assertTrue(refinery_import_mock.called)
        self.assertTrue(run_galaxy_mock.called)
        self.assertTrue(galaxy_import_mock.called)
        self.assertTrue(galaxy_export_mock.called)
        self.assertTrue(attach_outputs_mock.called)

    def test_file_import_task_termination_on_analysis_failure(self):
        with mock.patch(
            "core.models.Analysis.terminate_file_import_tasks"
        ) as terminate_mock:
            self.analysis.set_status(Analysis.FAILURE_STATUS)
            run_analysis(self.analysis.uuid)
            self.assertTrue(terminate_mock.called)

    @mock.patch.object(run_analysis, "retry", side_effect=None)
    def test_get_input_file_uuid_list_gets_called_in_refinery_import(
            self, retry_mock
    ):
        with mock.patch(
                "core.models.Analysis.get_input_file_uuid_list"
        ) as get_uuid_list_mock:
            _refinery_file_import(self.analysis.uuid)
            self.assertTrue(get_uuid_list_mock.called)
        self.assertTrue(retry_mock.called)

    def test_is_tool_based(self):
        self.assertFalse(self.analysis.is_tool_based)
