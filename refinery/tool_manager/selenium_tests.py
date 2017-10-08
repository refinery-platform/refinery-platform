import json
import logging
import time
from urlparse import urljoin

from django.conf import settings
from django.core.management import call_command
from django.http import HttpResponseBadRequest

from django_docker_engine.docker_utils import DockerClientWrapper
from docker.errors import NotFound
import mock
from rest_framework.test import force_authenticate

from selenium_testing.utils import (MAX_WAIT, SeleniumTestBaseGeneric,
                                    wait_until_class_visible)
from tool_manager.models import Tool, ToolDefinition, VisualizationTool
from tool_manager.tasks import django_docker_cleanup
from tool_manager.tests import TEST_DATA_PATH, ToolManagerTestBase

logger = logging.getLogger(__name__)


class VisualizationToolLaunchTests(ToolManagerTestBase,
                                   SeleniumTestBaseGeneric):
    def setUp(self):
        # super() will only ever resolve a single class type for a given method
        ToolManagerTestBase.setUp(self)
        SeleniumTestBaseGeneric.setUp(self)

    def tearDown(self):
        # super() will only ever resolve a single class type for a given method
        ToolManagerTestBase.tearDown(self)
        SeleniumTestBaseGeneric.tearDown(self)

        # Explicitly call delete() to purge any containers we spun up
        Tool.objects.all().delete()

    def test_transaction_rollback_bad_dataset_uuid(self):
        self.create_vis_tool_definition()

        self.post_data = {
            "dataset_uuid": self.dataset.uuid,
            "tool_definition_uuid": self.td.uuid,
            Tool.FILE_RELATIONSHIPS: str(["www.example.com/cool_file.txt"])
        }

        self.dataset.delete()

        self.post_request = self.factory.post(
            self.tools_url_root,
            data=self.post_data,
            format="json"
        )
        force_authenticate(self.post_request, self.user)
        self.post_response = self.tools_view(self.post_request)
        self.assertEqual(type(self.post_response), HttpResponseBadRequest)
        self.assertEqual(Tool.objects.count(), 0)
        self.assertIn("DataSet matching query does not exist.",
                      self.post_response.content)

    def _start_visualization(
            self, json_name, file_relationships,
            assertions=None, count=1
    ):
        with open(
            "{}/visualizations/{}".format(TEST_DATA_PATH, json_name)
        ) as f:
            tool_annotation = [json.loads(f.read())]

        with mock.patch(
            self.mock_vis_annotations_reference,
            return_value=tool_annotation
        ) as mocked_method:
            if count == 1:
                call_command("generate_tool_definitions", visualizations=True)
                self.assertTrue(mocked_method.called)

            self.assertEqual(ToolDefinition.objects.count(), 1)
            self.td = ToolDefinition.objects.all()[0]

            # Create mock ToolLaunchConfiguration
            self.post_data = {
                "dataset_uuid": self.dataset.uuid,
                "tool_definition_uuid": self.td.uuid,
                Tool.FILE_RELATIONSHIPS: str([file_relationships])
            }

            self.post_request = self.factory.post(
                self.tools_url_root,
                data=self.post_data,
                format="json"
            )
            force_authenticate(self.post_request, self.user)
            with mock.patch("tool_manager.models.get_solr_response_json"):
                post_response = self.tools_view(self.post_request)
            logger.debug("VisualizationTool response content: %s",
                         post_response.content)
            self.assertEqual(post_response.status_code, 200)

            tools = VisualizationTool.objects.filter(
                tool_definition__uuid=self.td.uuid
            )
            if count:
                self.assertEqual(len(tools), count)
            last_tool = tools.last()
            self.assertEqual(last_tool.get_owner(), self.user)
            self.assertEqual(
                last_tool.get_tool_type(),
                ToolDefinition.VISUALIZATION
            )

            if assertions:
                assertions(last_tool)

    def test_IGV(self):
        def assertions(tool):
            # Check to see if IGV shows what we want
            igv_url = urljoin(
                self.live_server_url,
                tool.get_relative_container_url()
            )

            self.browser.get(igv_url)
            time.sleep(15)

            wait_until_class_visible(self.browser, "igv-track-label", MAX_WAIT)
            self.assertEqual(
                "sample.seg",
                self.browser.find_elements_by_class_name(
                    "igv-track-label"
                )[0].text
            )

        self._start_visualization(
            'igv.json',
            self.live_server_url + "/tool_manager/test_data/sample.seg",
            assertions
        )

    def test_HiGlass(self):
        self._start_visualization(
            'higlass.json',
            "https://s3.amazonaws.com/pkerp/public/"
            "dixon2012-h1hesc-hindiii-allreps-filtered."
            "1000kb.multires.cool"
            # TODO: Add selenium-based test once higlass relative paths fixed
        )

    def test_docker_cleanup(self):
        wait_time = 1
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE = wait_time

        def assertions(tool):
            client = DockerClientWrapper(
                settings.DJANGO_DOCKER_ENGINE_DATA_DIR
            )
            client.lookup_container_url(tool.container_name)

            time.sleep(wait_time * 2)
            django_docker_cleanup()
            time.sleep(wait_time * 2)

            with self.assertRaises(NotFound):
                client.lookup_container_url(tool.container_name)

        self._start_visualization(
            'hello_world.json',
            "https://www.example.com/file.txt",
            assertions
        )

    def test_max_containers(self):
        for i in xrange(settings.DJANGO_DOCKER_ENGINE_MAX_CONTAINERS):
            self._start_visualization(
                'hello_world.json',
                "https://www.example.com/file.txt",
                count=i+1
            )

        with self.assertRaises(AssertionError):
            # '400 != 200': Not what we really want?
            self._start_visualization(
                'hello_world.json',
                "https://www.example.com/file.txt"
            )
