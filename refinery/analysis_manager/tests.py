import json
import uuid

import mock
from django.contrib.auth.models import User
from django.http import HttpResponseBadRequest, HttpResponseNotAllowed
from django.test import RequestFactory, TestCase
from guardian.utils import get_anonymous_user

from analysis_manager.utils import (create_analysis,
                                    fetch_objects_required_for_analysis,
                                    validate_analysis_config)
from analysis_manager.views import run
from core.models import Analysis, Workflow, WorkflowEngine
from factory_boy.utils import (create_dataset_with_necessary_models,
                               make_analyses_with_single_dataset)
from galaxy_connector.models import Instance


class AnalysisConfigTests(TestCase):
    """
    Test for validation of the two legacy ways of launching Analyses (
    using NodeSets and NodeRelationships) as well as for the new Tool-based
    approach
    """
    def test_valid_nodeset_analysis_config(self):
        validate_analysis_config(
            {
                "custom_name": "Valid NodeSet Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "nodeSetUuid": str(uuid.uuid4()),
                "user_id": 1,
                "workflowUuid": str(uuid.uuid4())
            }
        )

    def test_invalid_nodeset_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Missing a field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeSetUuid": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
            )

    def test_invalid_nodeset_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non-uuid field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeSetUuid": str(uuid.uuid4()),
                    "user_id": 1,
                    "workflowUuid": "Coffee"
                }
            )

    def test_invalid_nodeset_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non int field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeSetUuid": str(uuid.uuid4()),
                    "user_id": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
            )

    def test_valid_noderelationship_analysis_config(self):
        validate_analysis_config(
            {
                "custom_name": "Valid NodeRelationship Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "nodeSetUuid": str(uuid.uuid4()),
                "user_id": 1,
                "workflowUuid": str(uuid.uuid4())
            }
        )

    def test_invalid_noderelationship_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Missing a field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
            )

    def test_invalid_noderelationship_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non-uuid field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "user_id": 1,
                    "workflowUuid": "Coffee"
                }
            )

    def test_invalid_noderelationship_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non int field",
                    "studyUuid": str(uuid.uuid4()),
                    "nodeRelationshipUuid": str(uuid.uuid4()),
                    "user_id": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
            )

    def test_valid_tool_analysis_config(self):
        validate_analysis_config(
            {
                "custom_name": "Valid Tool Analysis Config",
                "studyUuid": str(uuid.uuid4()),
                "toolUuid": str(uuid.uuid4()),
                "user_id": 1,
                "workflowUuid": str(uuid.uuid4())
            }
        )

    def test_invalid_tool_analysis_config_missing_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Missing a field",
                    "studyUuid": str(uuid.uuid4()),
                    "toolUuid": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
            )

    def test_invalid_tool_analysis_config_non_uuid_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non-uuid field",
                    "studyUuid": str(uuid.uuid4()),
                    "toolUuid": str(uuid.uuid4()),
                    "user_id": 1,
                    "workflowUuid": "Coffee"
                }
            )

    def test_invalid_tool_analysis_config_non_int_field(self):
        with self.assertRaises(RuntimeError):
            validate_analysis_config(
                {
                    "custom_name": "Non int field",
                    "studyUuid": str(uuid.uuid4()),
                    "toolUuid": str(uuid.uuid4()),
                    "user_id": str(uuid.uuid4()),
                    "workflowUuid": str(uuid.uuid4())
                }
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
                "analysis_manager.utils.create_tool_analysis"
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

    def tearDown(self):
        User.objects.all().delete()

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

    @mock.patch("analysis_manager.tasks.run_analysis")
    def test_analysis_run_view_valid_data(self, run_mock):
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
            response = run(request)

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
