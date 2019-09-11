import logging

from django.test import TestCase

from core.models import (Workflow)
from factory_boy.django_model_factories import (ParameterFactory)
from .models import (Parameter)
from .tests import ToolManagerTestBase

logger = logging.getLogger(__name__)
TEST_DATA_PATH = "tool_manager/test_data"


class ToolDefinitionTests(ToolManagerTestBase):
    def setUp(self):
        super(ToolDefinitionTests, self).setUp()
        self.mock_parameter.delete()

    def test_get_annotation(self):
        self.create_vis_tool_definition(annotation_file_name="igv.json")
        self.assertEqual(self.td.get_annotation(),
                         self.tool_annotation_dict["annotation"])

    def test_get_extra_directories_vis_tool_def(self):
        self.create_vis_tool_definition()
        self.assertEqual(
            self.td.get_extra_directories(),
            ["/refinery-data"]
        )

    def test_get_extra_directories_workflow_tool_def(self):
        self.create_workflow_tool_definition()
        with self.assertRaises(NotImplementedError):
            self.td.get_extra_directories()

    def test_related_workflow_inactive_after_deletion(self):
        self.create_workflow_tool_definition()
        self.assertTrue(self.td.workflow.is_active)
        self.td.delete()
        self.assertFalse(
            Workflow.objects.all()[0].is_active
        )

    def test_get_parameters(self):
        self.create_vis_tool_definition(annotation_file_name="igv.json")
        tool_parameters = [p for p in self.td.get_parameters()]
        all_parameters = [p for p in Parameter.objects.all()]
        self.assertEqual(tool_parameters, all_parameters)


class ParameterTests(TestCase):
    def test_cast_param_value_to_proper_type_bool(self):
        test_bools = [True, False]
        for index, test_bool in enumerate(test_bools):
            parameter = ParameterFactory(
                name="Bool Param",
                description="Boolean Parameter",
                value_type=Parameter.BOOLEAN,
                default_value=str(test_bool)
            )
            for element in [parameter.default_value, test_bools[index]]:
                self.assertEqual(
                    test_bools[index],
                    parameter.cast_param_value_to_proper_type(element)
                )

    def test_cast_param_value_to_proper_type_string(self):
        test_string = "Coffee"
        for string_type in Parameter.STRING_TYPES:
            parameter = ParameterFactory(
                name="String Param",
                description="String Parameter",
                value_type=string_type,
                default_value=test_string
            )
            self.assertEqual(
                test_string,
                parameter.cast_param_value_to_proper_type(
                    parameter.default_value
                )
            )

    def test_cast_param_value_to_proper_type_int(self):
        test_int = 1
        parameter = ParameterFactory(
            name="Int Param",
            description="Integer Parameter",
            value_type=Parameter.INTEGER,
            default_value=str(test_int)
        )
        for element in [parameter.default_value, test_int]:
            self.assertEqual(
                test_int,
                parameter.cast_param_value_to_proper_type(element)
            )

    def test_cast_param_value_to_proper_type_float(self):
        test_float = 1.37
        parameter = ParameterFactory(
            name="Float Param",
            description="Float Parameter",
            value_type=Parameter.FLOAT,
            default_value=str(test_float)
        )
        for element in [parameter.default_value, test_float]:
            self.assertEqual(
                test_float,
                parameter.cast_param_value_to_proper_type(element)
            )
