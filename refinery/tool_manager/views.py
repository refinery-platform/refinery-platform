import logging
import urllib

from django.conf import settings
from django.db import transaction
from django.http import (HttpResponseBadRequest, HttpResponseForbidden,
                         JsonResponse)
from django.http.response import HttpResponse
from django.shortcuts import render

from django_docker_engine.proxy import Proxy
from rest_framework.decorators import detail_route
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core.models import DataSet

from .models import ToolDefinition, VisualizationTool, WorkflowTool
from .serializers import ToolDefinitionSerializer, ToolSerializer
from .utils import (
    create_tool, user_has_access_to_tool, validate_tool_launch_configuration
)

logger = logging.getLogger(__name__)


class ToolManagerViewSetBase(ModelViewSet):
    def __init__(self, **kwargs):
        super(ToolManagerViewSetBase, self).__init__(**kwargs)
        self.data_set = None

    def list(self, request, *args, **kwargs):
        try:
            data_set_uuid = self.request.query_params["data_set_uuid"]
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
            return super(ToolManagerViewSetBase, self).list(request)
        return HttpResponseForbidden(
            "User is not authorized to access DataSet with UUID: {}"
            .format(self.data_set.uuid)
        )


class ToolDefinitionsViewSet(ToolManagerViewSetBase):
    """ViewSet that allows for ToolDefinitions to be fetched"""
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']

    def list(self, request):
        if request.query_params.get('data_set_uuid'):
            return super(ToolDefinitionsViewSet, self).list(request)

        serializer = ToolDefinitionSerializer(ToolDefinition.objects.all(),
                                              many=True)
        return Response(serializer.data)

    def get_queryset(self):
        if self.request.user.has_perm('core.change_dataset', self.data_set):
            return ToolDefinition.objects.all()

        elif self.request.user.has_perm('core.read_dataset', self.data_set):
            return ToolDefinition.objects.filter(
                tool_type=ToolDefinition.VISUALIZATION
            )
        else:
            return []  # get_queryset should return an iterable


class ToolsViewSet(ToolManagerViewSetBase):
    """ViewSet that allows for Tools to be fetched, launched and relaunched"""
    serializer_class = ToolSerializer
    lookup_field = 'uuid'
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        visualization_tools = list(
            VisualizationTool.objects.filter(dataset=self.data_set)
        )
        workflow_tools = list(
            WorkflowTool.objects.filter(dataset=self.data_set)
        )
        tool_type = self.request.query_params.get("tool_type")
        if tool_type is None:
            return workflow_tools + visualization_tools
        elif tool_type.upper() == ToolDefinition.WORKFLOW:
            return workflow_tools
        elif tool_type.upper() == ToolDefinition.VISUALIZATION:
            return visualization_tools
        else:
            return []  # get_queryset should return an iterable

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
                    tool.launch()
                    serializer = ToolSerializer(
                        tool, context={'request': request}
                    )
            except Exception as e:
                logger.error(e)
                return HttpResponseBadRequest(e)
            else:
                logger.debug("Successfully created Tool: %s", tool.name)
                return JsonResponse(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Allows for the deletion of a VisualizationTool"""
        tool_uuid = kwargs.get("uuid")
        if not tool_uuid:
            return HttpResponseBadRequest(
                "Deleting a Tool requires a Tool UUID"
            )
        visualization_tool = get_object_or_404(VisualizationTool,
                                               uuid=tool_uuid)

        if not request.user == visualization_tool.get_owner():
            return render_vis_tool_error_template(
                request,
                visualization_tool.name,
                "User: {} does not have permission to delete {}: {}".format(
                    request.user.username,
                    visualization_tool.name,
                    visualization_tool.uuid
                ), status=403
            )
        try:
            with transaction.atomic():
                visualization_tool.delete()
        except Exception as exc:
            logger.error(exc)
            return HttpResponseBadRequest("{} could not be deleted: {}".format(
                visualization_tool.display_name, exc
            ))
        else:
            return HttpResponse("{} deleted successfully".format(
                visualization_tool.display_name
            ))

    @detail_route(methods=['get'])
    def relaunch(self, request, *args, **kwargs):
        tool_uuid = kwargs.get("uuid")
        if not tool_uuid:
            return HttpResponseBadRequest("Relaunching a Tool requires a Tool "
                                          "UUID")
        visualization_tool = get_object_or_404(VisualizationTool,
                                               uuid=tool_uuid)

        if not user_has_access_to_tool(request.user, visualization_tool):
            return render_vis_tool_error_template(
                request,
                visualization_tool.name,
                "User: {} does not have permission to view {}: {}".format(
                    request.user.username,
                    visualization_tool.name,
                    visualization_tool.uuid
                ), status=403
            )

        if visualization_tool.is_running():
            return HttpResponseBadRequest("Can't relaunch a Tool that is "
                                          "currently running")
        try:
            visualization_tool.launch()
            serializer = ToolSerializer(
                visualization_tool, context={'request': request}
            )
            return JsonResponse(serializer.data)
        except Exception as e:
            logger.error(e)
            return HttpResponseBadRequest(e)

    @detail_route(methods=['get'])
    def container_input_data(self, request, *args, **kwargs):
        tool_uuid = kwargs.get("uuid")
        tool = get_object_or_404(VisualizationTool, uuid=tool_uuid)
        return JsonResponse(tool.get_container_input_dict())


class AutoRelaunchProxy(Proxy, object):
    """
    Wrapper around Django-Docker-Engine Proxy to allow for VisualizationTools
    that had been launched previously to have persisting urls even after
    their containers hve been destroyed, rather than relying on users to
    manually relaunch (although that remains an option).
    """
    def __init__(self):
        super(AutoRelaunchProxy, self).__init__(
            please_wait_title='Please wait...',
            please_wait_body_html='''
                <style>
                body {{
                  font-family: "Source Sans Pro",Helvetica,Arial,sans-serif;
                  font-size: 40pt;
                  text-align: center;
                }}
                div {{
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  margin-right: -50%;
                  transform: translate(-50%, -50%)
                }}
                </style>

                <div>
                <img src="{0}/logo.svg" width='150'>
                <p>Please wait...</p>
                <img src="{0}/spinner.gif">
                </div>
            '''.format(settings.STATIC_URL + 'images')
        )

    def _proxy_view(self, request, container_name, url):
        visualization_tool = get_object_or_404(
            VisualizationTool,
            container_name=container_name
        )
        if not user_has_access_to_tool(request.user, visualization_tool):
            return render_vis_tool_error_template(
                request,
                visualization_tool.name,
                "User: {} does not have permission to view {}: {}".format(
                    request.user.username,
                    visualization_tool.name,
                    visualization_tool.uuid
                ), status=403
            )

        if not visualization_tool.is_running():
            visualization_tool.launch()

        try:
            return super(AutoRelaunchProxy, self)._proxy_view(
                request, container_name, url
            )
        except urllib.error.URLError as e:
            logger.info('Normal transient error: %s', e)
            view = self._please_wait_view_factory().as_view()
            return view(request)


def render_vis_tool_error_template(
    request, visualization_tool_name, message,
    template="tool_manager/vis-tool-error.html", status=400
):
    return render(
        request, template,
        {
            "message": message,
            "visualization_tool_name": visualization_tool_name
        }, status=status
    )
