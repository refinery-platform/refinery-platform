import logging

from django.db import transaction
from django.http import HttpResponseBadRequest

from guardian.exceptions import GuardianError
from guardian.shortcuts import get_objects_for_user
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.models import DataSet

from .models import Tool, ToolDefinition
from .serializers import ToolDefinitionSerializer, ToolSerializer
from .utils import create_tool, validate_tool_launch_configuration

logger = logging.getLogger(__name__)


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']

    def get_queryset(self, **kwargs):
        if self.request.user.has_perm(
            'core.share_dataset',
            kwargs["data_set"]
        ):
            return ToolDefinition.objects.all()

        elif self.request.user.has_perm(
            'core.read_dataset',
            kwargs["data_set"]
        ):
            return ToolDefinition.objects.filter(
                tool_type=ToolDefinition.VISUALIZATION
            )

    def list(self, request, *args, **kwargs):
        try:
            data_set_uuid = self.request.query_params["data_set_uuid"]
        except (AttributeError, KeyError) as e:
            return Response(e, status=status.HTTP_400_BAD_REQUEST)

        try:
            data_set = DataSet.objects.get(uuid=data_set_uuid)
        except (DataSet.DoesNotExist, DataSet.MultipleObjectsReturned) as e:
            return Response(e, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset(data_set=data_set)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ToolsViewSet(ModelViewSet):
    """API endpoint that allows for Tools to be fetched and launched"""
    queryset = Tool.objects.all()
    serializer_class = ToolSerializer
    lookup_field = 'uuid'
    http_method_names = ['get', 'post']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view returns a list of all the Tools that the currently
        authenticated user has read permissions on.
        """
        user_tools = []
        try:
            user_tools.extend(
                get_objects_for_user(
                    self.request.user,
                    "tool_manager.read_workflowtool"
                )
            )
            user_tools.extend(
                get_objects_for_user(
                    self.request.user,
                    "tool_manager.read_visualizationtool"
                )
            )
        except GuardianError as e:
            return HttpResponseBadRequest(e)

        return user_tools

    def create(self, request, *args, **kwargs):
        """
        Create and launch a Tool upon successful validation checks
        """
        try:
            validate_tool_launch_configuration(request.data)
        except RuntimeError as e:
            return HttpResponseBadRequest(e)
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
