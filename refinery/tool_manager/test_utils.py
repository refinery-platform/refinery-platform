import json
import logging

import bioblend
import mock
from django.conf import settings
from django.core.management import CommandError, call_command
from guardian.shortcuts import assign_perm

from file_store.models import FileType
from tool_manager.management.commands.load_tools import \
    Command as LoadToolsCommand
from .models import (FileRelationship, GalaxyParameter, InputFile, Parameter,
                     Tool, ToolDefinition)
from .utils import (FileTypeValidationError, create_tool,
                    create_tool_definition, get_workflows,
                    user_has_access_to_tool, validate_tool_annotation,
                    validate_tool_launch_configuration,
                    validate_workflow_step_annotation)
from .tests import ToolManagerTestBase

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


class ToolDefinitionGenerationTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolDefinitionGenerationTests, self).setUp()
        raw_input_reference = "__builtin__.raw_input"
        self.raw_input_yes_mock = mock.patch(
            raw_input_reference,
            return_value="y"
        )
        self.raw_input_no_mock = mock.patch(
            raw_input_reference,
            side_effect=["coffee", "n"]
        )
        with open(
            "{}/workflows/galaxy_workflows_valid.json".format(TEST_DATA_PATH)
        ) as f:
            self.valid_workflows = json.loads(f.read())

        with open(
            "{}/workflows/galaxy_workflows_invalid.json".format(TEST_DATA_PATH)
        ) as f:
            self.invalid_workflows = json.loads(f.read())

        self.mock_parameter.delete()

        self.fake_workflow = {
            "name": "Fake WF",
            "graph": {"steps": {}}
        }

    def test_tool_definition_model_str(self):
        self.load_visualizations()
        td = ToolDefinition.objects.all()[0]
        self.assertEqual(
            td.__str__(),
            "VISUALIZATION: Test LIST Visualization IGV {}".format(
                td.uuid
            )
        )

    def test_workflow_improperly_annotated(self):
        with open(
                "{}/workflows/annotation_invalid.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_bad_nesting(self):
        with open(
            "{}/workflows/annotation_bad_nesting.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_with_good_parameters_validation(self):
        with open(
            "{}/workflows/annotation_valid_parameters.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_visualization_tool_def_validation(self):
        with open(
            "{}/visualizations/hello_world.json".format(TEST_DATA_PATH)
        ) as f:
            visualization_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(visualization_annotation)
            )

    def test_list_visualization_tool_def_generation(self):
        self.create_vis_tool_definition()

        self.assertEqual(ToolDefinition.objects.count(), 1)

        self.assertEqual(self.td.parameters.count(), 1)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(self.td.file_relationship.input_files.count(), 1)

    def test_list_workflow_tool_def_validation(self):
        with open("{}/workflows/LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition()

        self.assertEqual(ToolDefinition.objects.count(), 1)

        self.assertEqual(self.td.parameters.count(), 7)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(self.td.file_relationship.input_files.count(), 1)
        self.assertIsNotNone(self.td.workflow)

    def test_list_pair_workflow_tool_def_validation(self):
        with open("{}/workflows/LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(validate_tool_annotation(workflow_annotation))

    def test_list_pair_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR.json"
        )

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 6)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            second_nested_file_relationship.input_files.count(),
            2
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_list_pair_workflow_tool_def_validation(self):
        with open(
            "{}/workflows/LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_list_pair_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:LIST:PAIR.json"
        )
        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 3)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(),
            1
        )
        third_nested_file_relationship = \
            second_nested_file_relationship.file_relationship.all()[0]
        self.assertEqual(
            third_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            third_nested_file_relationship.input_files.count(),
            2
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_pair_list_workflow_tool_def_validation(self):
        with open(
                "{}/workflows/LIST:PAIR:LIST.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_tool_annotation(workflow_annotation)
            )

    def test_list_pair_list_workflow_tool_def_generation(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR:LIST.json"
        )

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(self.td.parameters.count(), 3)
        self.assertEqual(
            self.td.file_relationship.file_relationship.count(),
            1
        )
        self.assertEqual(
            self.td.file_relationship.value_type,
            FileRelationship.LIST
        )
        second_nested_file_relationship = \
            self.td.file_relationship.file_relationship.all()[0]
        self.assertEqual(
            second_nested_file_relationship.value_type,
            FileRelationship.PAIR
        )
        self.assertEqual(
            second_nested_file_relationship.file_relationship.count(), 1)
        third_nested_file_relationship = \
            second_nested_file_relationship.file_relationship.all()[0]
        self.assertEqual(
            third_nested_file_relationship.value_type,
            FileRelationship.LIST
        )
        self.assertEqual(
            third_nested_file_relationship.file_relationship.count(),
            0
        )
        self.assertEqual(
            third_nested_file_relationship.input_files.count(),
            1
        )
        self.assertIsNotNone(self.td.workflow)

    def test_list_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition()
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_pair_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_list_pair_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:LIST:PAIR.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_list_pair_list_workflow_related_object_deletion(self):
        self.create_workflow_tool_definition(
            annotation_file_name="LIST:PAIR:LIST.json"
        )
        self.td.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_deletion_of_a_respective_tooldefinitions_objects_only(self):
        with open(
            "{}/workflows/LIST:LIST:PAIR.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td1 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflows/LIST:PAIR.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td2 = ToolDefinition.objects.get(name=workflow_annotation["name"])
        with open("{}/workflows/LIST.json".format(TEST_DATA_PATH)) as f:
            workflow_annotation = json.loads(f.read())
            workflow_annotation[
                "workflow_engine_uuid"
            ] = self.workflow_engine.uuid
            create_tool_definition(workflow_annotation)

            td3 = ToolDefinition.objects.get(name=workflow_annotation["name"])

        td1.delete()

        self.assertEqual(ToolDefinition.objects.count(), 2)
        self.assertEqual(FileRelationship.objects.count(), 3)
        self.assertEqual(GalaxyParameter.objects.count(), 13)
        self.assertEqual(Parameter.objects.count(), 13)
        self.assertEqual(InputFile.objects.count(), 3)

        td2.delete()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.assertEqual(FileRelationship.objects.count(), 1)
        self.assertEqual(GalaxyParameter.objects.count(), 7)
        self.assertEqual(Parameter.objects.count(), 7)
        self.assertEqual(InputFile.objects.count(), 1)

        td3.delete()

        self.assertEqual(ToolDefinition.objects.count(), 0)
        self.assertEqual(FileRelationship.objects.count(), 0)
        self.assertEqual(GalaxyParameter.objects.count(), 0)
        self.assertEqual(Parameter.objects.count(), 0)
        self.assertEqual(InputFile.objects.count(), 0)

    def test_valid_workflow_step_annotations_a(self):
        with open(
            "{}/workflows/step_annotation_valid_a.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_b(self):
        with open(
            "{}/workflows/step_annotation_valid_b.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(
                    workflow_step_annotation
                )
            )

    def test_valid_workflow_step_annotations_c(self):
        with open(
            "{}/workflows/step_annotation_valid_c.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertIsNone(
                validate_workflow_step_annotation(workflow_step_annotation)
            )

    def test_invalid_workflow_step_annotation_b(self):
        with open(
            "{}/workflows/step_annotation_invalid_b.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_invalid_workflow_step_annotation_c(self):
        with open(
            "{}/workflows/step_annotation_invalid_c.json".format(
                TEST_DATA_PATH
            )
        ) as f:
            workflow_step_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_workflow_step_annotation,
                workflow_step_annotation
            )

    def test_load_tools_management_command(self):
        with mock.patch(
            self.mock_get_workflows_reference,
            side_effect=[
                {self.workflow_engine.uuid: self.invalid_workflows},
                {self.workflow_engine.uuid: self.valid_workflows}
            ]
        ) as get_wf_mock:
            self.assertRaises(
                CommandError,
                call_command,
                "load_tools",
                "--workflows"
            )

            self.assertEqual(ToolDefinition.objects.count(), 0)
            self.load_visualizations()

            self.assertEqual(get_wf_mock.call_count, 1)
            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.assertEqual(FileRelationship.objects.count(), 1)
            self.assertEqual(GalaxyParameter.objects.count(), 0)
            self.assertEqual(Parameter.objects.count(), 1)
            self.assertEqual(InputFile.objects.count(), 1)

    def test_load_tools_overwrites_visualizations_if_forced(
            self
    ):
        self.raw_input_yes_mock.start()
        visualizations = self.load_visualizations()
        original_ids = [t.id for t in ToolDefinition.objects.all()]

        # Create new VisualizationToolDefinition with --force
        call_command("load_tools", "--visualizations",
                     " ".join(visualizations), "--force")
        new_ids = [t.id for t in ToolDefinition.objects.all()]

        # Assert that the new visualization tool definitions id's were
        # incremented
        self.assertEqual(new_ids, [_id + 1 for _id in original_ids])

    def test_load_tools_overwrites_workflows_if_forced(
            self
    ):
        self.raw_input_yes_mock.start()
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ) as get_wf_mock:
            # Create WorkflowToolDefinition
            call_command("load_tools", "--workflows")
            original_ids = [t.id for t in ToolDefinition.objects.all()]

            # Create new WorkflowToolDefinition with --force
            call_command("load_tools", "--workflows", "--force")
            new_ids = [t.id for t in ToolDefinition.objects.all()]

            # Assert that the new workflow tool definitions id's were
            # incremented
            for original_id in original_ids:
                self.assertIn(original_id + 3, new_ids)
            self.assertEqual(get_wf_mock.call_count, 2)

    def test_load_tools_with_force_allows_user_dismissal(
            self
    ):
        self.raw_input_no_mock.start()
        with mock.patch(
                self.mock_get_workflows_reference,
                return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            with self.assertRaises(SystemExit):
                # Create WorkflowToolDefinition
                call_command("load_tools", "--workflows", "--force")

        self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_load_tools_command_error_if_get_workflows_fails(
            self
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            side_effect=RuntimeError
        ):
            with self.assertRaises(CommandError):
                call_command("load_tools", "--workflows")

    def test_load_tools_multiple_times_skips_without_deletion(
            self
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            call_command("load_tools", "--workflows")
            tool_definitions_a = [t for t in ToolDefinition.objects.all()]

            call_command("load_tools", "--workflows")
            tool_definitions_b = [t for t in ToolDefinition.objects.all()]

        self.assertEqual(tool_definitions_a, tool_definitions_b)

    @mock.patch.object(
        LoadToolsCommand,
        "_get_available_visualization_tool_registry_names"
    )
    def test_load_tools_error_message_yields_vis_registry_info(
            self,
            get_available_vis_tool_names_mock
    ):
        fake_registry_tool_names = "a, b, c, d"
        fake_vis_tool_name = "coffee"
        get_available_vis_tool_names_mock.return_value = (
            fake_registry_tool_names
        )

        with self.settings(
                REFINERY_VISUALIZATION_REGISTRY="http://www.example.com"
        ):
            with self.assertRaises(CommandError) as context:
                self.load_visualizations(visualizations=[fake_vis_tool_name])
                self.assertTrue(get_available_vis_tool_names_mock.called)
            self.assertIn(
                "Available Visualization Tools from the Registry ({}) are: {}"
                .format(
                    settings.REFINERY_VISUALIZATION_REGISTRY,
                    fake_registry_tool_names
                ),
                context.exception.message
            )

    def test_load_tools_command_error_if_branch_and_workflows_specified(self):
        with self.assertRaises(CommandError):
            call_command("load_tools", "--workflows",
                         branch="fake-branch-name")

    @mock.patch.object(LoadToolsCommand, "_load_visualization_definitions")
    def test_load_tools_command_registry_branch_specified(
            self, load_vis_mock
    ):
        visualization_tool_registry_branch = "fake-branch-name"
        command = LoadToolsCommand()
        command.handle(
            workflows=False,
            visualizations=["test-vis-tool-name"],
            branch=visualization_tool_registry_branch,
            force=False
        )
        self.assertEqual(command.visualization_registry_branch,
                         visualization_tool_registry_branch)
        self.assertTrue(load_vis_mock.called)

    def test_workflow_pair_too_many_inputs(self):
        with open(
            "{}/workflows/PAIR_too_many_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_pair_not_enough_inputs(self):
        with open(
            "{}/workflows/PAIR_not_enough_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_workflow_list_not_enough_inputs(self):
        with open(
            "{}/workflows/LIST_not_enough_inputs.json".format(TEST_DATA_PATH)
        ) as f:
            workflow_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                workflow_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_visualization_annotation_extra_dirs_valid(self):
        with open(
            "{}/visualizations/LIST_visualization_good_extra_directories.json"
            .format(TEST_DATA_PATH)
        ) as f:
            visualization_annotation = json.loads(f.read())
            create_tool_definition(visualization_annotation)
            self.assertEqual(ToolDefinition.objects.count(), 1)

    def test_visualization_annotation_extra_dirs_invalid(self):
        with open("{}/visualizations/"
                  "LIST_visualization_bad_extra_directories_structure.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                visualization_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def test_visualization_annotation_extra_dirs_missing(self):
        with open("{}/visualizations/"
                  "LIST_visualization_missing_extra_directories.json"
                  .format(TEST_DATA_PATH)) as f:
            visualization_annotation = json.loads(f.read())
            self.assertRaises(
                RuntimeError,
                validate_tool_annotation,
                visualization_annotation
            )
            self.assertEqual(ToolDefinition.objects.count(), 0)

    def _assert_visualization_tool_def_exception_contents(
        self,
        exception,
        tool_annotation_name,
        messages
    ):
        assert type(messages) == list
        visualizations = [
            "{}/visualizations/{}.json".format(
                TEST_DATA_PATH,
                tool_annotation_name
            )
        ]
        with self.assertRaises(exception) as context:
            call_command("load_tools", "--visualizations",
                         " ".join(visualizations))
        [self.assertIn(message, context.exception.message)
         for message in messages]

    def test_visualization_generation_with_no_image_version_yields_error(self):
        self._assert_visualization_tool_def_exception_contents(
            CommandError,
            "no_docker_image_version",
            ["no specified version"]
        )

    def test_tool_def_generation_with_bad_filetype_yields_error(self):
        self._assert_visualization_tool_def_exception_contents(
            CommandError,
            "bad_filetype",
            [
                "BAD FILETYPE",
                str([filetype.name for filetype in FileType.objects.all()])
            ]
        )

    def test_known_galaxy_one_off_asterisking_error_is_handled(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.BAD_WORKFLOW_OUTPUTS,
            "1": self.GOOD_WORKFLOW_OUTPUTS
        }
        workflow_exhibiting_one_off_asterisking_error = self.fake_workflow

        with self.assertRaises(CommandError) as context:
            LoadToolsCommand()._has_workflow_outputs(
                workflow_exhibiting_one_off_asterisking_error
            )
        self.assertIn("asterisked `workflow_outputs`",
                      context.exception.message)

    def test__has_workflow_outputs_bad_workflow_outputs(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.GOOD_WORKFLOW_OUTPUTS,
            "1": self.BAD_WORKFLOW_OUTPUTS
        }
        workflow_without_outputs_defined = self.fake_workflow

        self.assertFalse(
            LoadToolsCommand()._has_workflow_outputs(
                workflow_without_outputs_defined
            )
        )

    def test__has_workflow_outputs_good_workflow_outputs(self):
        self.fake_workflow["graph"]["steps"] = {
            "0": self.GOOD_WORKFLOW_OUTPUTS,
            "1": self.GOOD_WORKFLOW_OUTPUTS
        }
        workflow_with_outputs_defined = self.fake_workflow
        LoadToolsCommand()._has_workflow_outputs(
            workflow_with_outputs_defined
        )

    @mock.patch.object(
        LoadToolsCommand,
        "_has_workflow_outputs",
        return_value=False
    )
    def test_generate_workflows_without_outputs_raises_exception(
            self,
            _are_workflow_outputs_present_mock
    ):
        with mock.patch(
            self.mock_get_workflows_reference,
            return_value={self.workflow_engine.uuid: self.valid_workflows}
        ):
            with self.assertRaises(CommandError) as context:
                LoadToolsCommand()._generate_workflows()
        self.assertIn("does not have `workflow_outputs`",
                      context.exception.message)
        self.assertTrue(_are_workflow_outputs_present_mock.called)

    def test_workflow_description_is_set_from_tool_definition_annotation(self):
        self.create_workflow_tool_definition()
        self.assertEqual(self.td.description, self.td.workflow.description)


class ToolLaunchConfigurationTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolLaunchConfigurationTests, self).setUp()

        self.load_visualizations()

        self.assertEqual(ToolDefinition.objects.count(), 1)
        self.td = ToolDefinition.objects.all()[0]

    def test_invalid_TLC_bad_json(self):
        tool_launch_configuration = "This isn't valid JSON"
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_invalid_TLC_schema(self):
        tool_launch_configuration = {
            "valid": "JSON",
        }
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_invalid_TLC_non_pythonic_file_relationships(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: "!!{}!!".format(
                str(["www.example.com/cool_file.txt"])
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            "ToolLaunchConfiguration's `file_relationships` could not be "
            "evaluated as a Pythonic Data Structure",
            context.exception.message
        )

    def test_invalid_TLC_non_LIST_PAIR_file_relationships(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    (
                        {"Dicts aren't": "LIST/PAIR-like"},
                        {"Dicts aren't": "LIST/PAIR-like"}
                    ),
                    (
                        {"Dicts aren't": "LIST/PAIR-like"},
                        {"Dicts aren't": "LIST/PAIR-like"}
                    )
                ]
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            '{"Dicts aren\'t": \'LIST/PAIR-like\'}',
            context.exception.message
        )

    def test_invalid_TLC_non_file_relationships_unbalanced(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    ("a", "b"),
                    ["c", "d"]
                ]
            )
        }
        with self.assertRaises(RuntimeError) as context:
            create_tool(tool_launch_configuration, self.user)
        self.assertIn(
            "LIST/PAIR structure is not balanced",
            context.exception.message
        )

    def test_invalid_TLC_bad_tooldefinition_uuid(self):
        tool_launch_configuration = {
            "tool_definition_uuid": "This is an invalid ToolDef UUID",
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"])
        }
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn(
            "Tool launch configuration is not properly configured",
            context.exception.message
        )

    def test_valid_tool_launch_config_LIST(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                ["coffee"]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_LIST_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    ("coffee", "coffee")
                ]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_LIST_LIST_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                [
                    [
                        ("coffee", "coffee"),
                        ("coffee", "coffee"),
                        ("coffee", "coffee"),
                        ("coffee", "coffee")
                    ]
                ]
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_PAIR(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                ("coffee", "coffee")
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_valid_tool_launch_config_PAIR_LIST(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                (["coffee", "coffee"], ["coffee", "coffee"])
            )
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_tool_launch_config_with_custom_display_name(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                (["coffee", "coffee"], ["coffee", "coffee"])
            ),
            "display_name": "Test Tool"
        }
        validate_tool_launch_configuration(tool_launch_configuration)

    def test_tool_launch_config_with_non_string_display_name_fails(self):
        tool_launch_configuration = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(
                (["coffee", "coffee"], ["coffee", "coffee"])
            ),
            "display_name": 12345678
        }
        with self.assertRaises(RuntimeError) as context:
            validate_tool_launch_configuration(tool_launch_configuration)
        self.assertIn("is not of type u'string'", context.exception.message)


class ToolManagerUtilitiesTests(ToolManagerTestBase):
    def test_file_type_validation_error(self):
        bad_filetype = "COFFEE"
        error_message = "FileType `{}` does not exist".format(bad_filetype)

        file_type_validation_error = FileTypeValidationError(
            bad_filetype,
            error_message
        )
        self.assertIn(bad_filetype, file_type_validation_error.message)
        self.assertIn(error_message, file_type_validation_error.message)
        self.assertIn(
            str([f.name for f in FileType.objects.all()]),
            file_type_validation_error.message
        )

    @mock.patch(
        "bioblend.galaxy.workflows.WorkflowClient.export_workflow_dict",
        return_value="workflow_graph"
    )
    @mock.patch(
        "bioblend.galaxy.workflows.WorkflowClient.show_workflow",
        return_value={"graph": None}
    )
    def test_get_workflows(self, show_workflow_mock, exported_workflow_mock):
        with mock.patch.object(
            bioblend.galaxy.workflows.WorkflowClient,
            "get_workflows",
            return_value=[{"id": self.GALAXY_ID_MOCK}]
        ) as bioblend_get_workflows_mock:
            workflows = get_workflows()
        self.assertEqual(
            workflows,
            {
                self.workflow_engine.uuid: [
                    {
                        "graph": "workflow_graph"
                    }
                ]
            }
        )

        self.assertTrue(bioblend_get_workflows_mock.called)
        self.assertTrue(show_workflow_mock.called)
        self.assertTrue(exported_workflow_mock.called)

    def test_get_workflows_with_connection_error(self):
        with mock.patch.object(
            bioblend.galaxy.workflows.WorkflowClient,
            "get_workflows",
            side_effect=bioblend.ConnectionError("Bad Connection")
        ):
            with self.assertRaises(RuntimeError) as context:
                get_workflows()
            self.assertIn(
                "Unable to retrieve workflows from '{}'".format(
                    self.workflow_engine.instance.base_url
                ),
                context.exception.message
            )

    def test_user_has_access_to_tool(self):
        self.create_tool(ToolDefinition.VISUALIZATION)
        assign_perm('core.read_dataset', self.user, self.tool.dataset)
        self.assertTrue(user_has_access_to_tool(self.user, self.tool))
        self.assertFalse(user_has_access_to_tool(self.user2, self.tool))
