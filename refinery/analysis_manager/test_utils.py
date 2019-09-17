import uuid

from django.test import TestCase

from guardian.utils import get_anonymous_user

from analysis_manager.utils import (
    fetch_objects_required_for_analysis, validate_analysis_config
)
from core.models import Project, Workflow, WorkflowEngine
from data_set_manager.models import Assay
from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import create_dataset_with_necessary_models


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
            self.assertIn("Couldn't fetch Workflow", str(context.exception))

    def test_fetch_objects_required_for_analyses_bad_study(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": "COFFEE",
                    "user_id": self.user.id,
                    "workflow_uuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch Study", str(context.exception))

    def test_fetch_objects_required_for_analyses_bad_user(self):
        with self.assertRaises(RuntimeError) as context:
            fetch_objects_required_for_analysis(
                {
                    "study_uuid": self.study.uuid,
                    "user_id": 400,
                    "workflow_uuid": self.workflow.uuid
                }
            )
            self.assertIn("Couldn't fetch User", str(context.exception))
