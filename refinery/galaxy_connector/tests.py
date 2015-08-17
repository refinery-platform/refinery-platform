from django.utils import unittest

from galaxy_connector import galaxy_workflow


class GalaxyWorkflowTest(unittest.TestCase):
    """Test all functions in the galaxy_workflow module"""
    def test_parse_tool_name_full(self):
        """Test with a toolshed name"""
        toolshed_name = \
            'toolshed.g2.bx.psu.edu/repos/jjohnson/igvtools/igvtools_tile/1.0'
        short_name = 'igvtools_tile'
        self.assertEqual(
            galaxy_workflow.parse_tool_name(toolshed_name), short_name)

    def test_parse_tool_name_short(self):
        """Test with a non-toolshed name"""
        name = 'igvtools_tile'
        short_name = 'igvtools_tile'
        self.assertEqual(galaxy_workflow.parse_tool_name(name), short_name)
