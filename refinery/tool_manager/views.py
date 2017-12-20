import logging

from django.db import transaction
from django.http import HttpResponseBadRequest, HttpResponseForbidden

from guardian.shortcuts import get_objects_for_user
from rest_framework import status
from rest_framework.decorators import detail_route
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.models import DataSet

from .models import Tool, ToolDefinition, VisualizationTool
from .serializers import ToolDefinitionSerializer, ToolSerializer
from .utils import create_tool, validate_tool_launch_configuration

logger = logging.getLogger(__name__)


class ToolManagerViewSetBase(ModelViewSet):
    def __init__(self, **kwargs):
        super(ToolManagerViewSetBase, self).__init__(**kwargs)
        self.data_set = None
        self.user_tools = []
        self.visualization_tools = None
        self.workflow_tools = None

    def list(self, request, *args, **kwargs):
        try:
            data_set_uuid = self.request.query_params[
                kwargs["data_set_uuid_lookup_name"]
            ]
        except (AttributeError, KeyError) as e:
            return HttpResponseBadRequest("Must specify a DataSet "
                                          "UUID: {}".format(e))

        try:
            self.data_set = DataSet.objects.get(uuid=data_set_uuid)
        except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned) as e:
            return HttpResponseBadRequest(
                "Couldn't fetch DataSet with UUID: {} {}"
                .format(data_set_uuid, e)
            )
        if self.request.user.has_perm('core.read_meta_dataset', self.data_set):
            self.visualization_tools = \
                self._get_tools_launched_on_requested_dataset("visualization")
            self.user_tools.extend(self.visualization_tools)

            self.workflow_tools = \
                self._get_tools_launched_on_requested_dataset("workflow")
            self.user_tools.extend(self.workflow_tools)
        else:
            return Response(
                "User is not authorized to access DataSet with UUID: {}"
                .format(self.data_set.uuid),
                status.HTTP_401_UNAUTHORIZED
            )
        return super(ToolManagerViewSetBase, self).list(request)

    def _get_tools_launched_on_requested_dataset(self, tool_type):
        tools = get_objects_for_user(
            self.request.user,
            "tool_manager.read_{}tool".format(tool_type)
        ).filter(dataset=self.data_set)
        return tools


class ToolDefinitionsViewSet(ToolManagerViewSetBase):
    """API endpoint that allows for ToolDefinitions to be fetched"""
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']

    def get_queryset(self):
        if self.request.user.has_perm('core.share_dataset', self.data_set):
            return ToolDefinition.objects.all()

        elif self.request.user.has_perm('core.read_dataset', self.data_set):
            return ToolDefinition.objects.filter(
                tool_type=ToolDefinition.VISUALIZATION
            )

    def list(self, request, *args, **kwargs):
        return super(ToolDefinitionsViewSet, self).list(
            request,
            data_set_uuid_lookup_name="dataSetUuid"
        )


class ToolsViewSet(ToolManagerViewSetBase):
    """API endpoint that allows for Tools to be fetched and launched"""
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    lookup_field = 'uuid'
    http_method_names = ['get', 'post']
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        return super(ToolsViewSet, self).list(
            request,
            data_set_uuid_lookup_name="data_set_uuid"
        )

    def get_queryset(self):
        """
        This view returns a list of all the Tools that the currently
        authenticated user has read permissions on.
        """
        tool_type = self.request.query_params.get("tool_type")

        if not tool_type:
            return self.user_tools

        return self.visualization_tools \
            if tool_type == 'visualization' else self.workflow_tools

    def create(self, request, *args, **kwargs):
        """
        Create and launch a Tool upon successful validation checks
        """

        try:
            validate_tool_launch_configuration(request.data)
        except RuntimeError as e:
            return HttpResponseBadRequest("Invalid tool launch "
                                          "configuration: {}".format(e))
        else:
            tool_launch_configuration = request.data
            try:
                with transaction.atomic():
                    tool = create_tool(tool_launch_configuration, request.user)
                    logger.debug("Successfully created Tool: %s", tool.name)
                    return tool.launch()
            except Exception as e:
                logger.error(e)
                return HttpResponseBadRequest(e)

    @detail_route(methods=['get'])
    def relaunch(self, request, *args, **kwargs):
        tool_uuid = kwargs.get("uuid")
        if not tool_uuid:
            return HttpResponseBadRequest("Relaunching a Tool requires a Tool "
                                          "UUID")
        try:
            tool = VisualizationTool.objects.get(uuid=tool_uuid)
        except (VisualizationTool.DoesNotExist,
                VisualizationTool.MultipleObjectsReturned) as e:
            return HttpResponseBadRequest(
                "Couldn't retrieve VisualizationTool with UUID: {}, {}"
                .format(tool_uuid, e)
            )

        if not request.user.has_perm('core.read_dataset', tool.dataset):
            return HttpResponseForbidden(
                "Requesting User does not have sufficient permissions to "
                "relaunch Tool with uuid: {}".format(tool_uuid)
            )

        if tool.is_running():
            return HttpResponseBadRequest("Can't relaunch a Tool that is "
                                          "currently running")
        try:
            return tool.launch()
        except Exception as e:
            logger.error(e)
            return HttpResponseBadRequest(e)
