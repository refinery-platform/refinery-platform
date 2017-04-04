import json
import logging

from django.http import HttpResponseBadRequest, HttpResponseServerError
from django.shortcuts import redirect
from django_docker_engine.docker_utils import DockerContainerSpec
from docker.errors import APIError

from jsonschema import validate, ValidationError

from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from .models import ToolDefinition, VisualizationContainer
from .serializers import (ToolDefinitionSerializer,
                          VisualizationContainerSerializer)

logger = logging.getLogger(__name__)


class ToolDefinitionsViewSet(ModelViewSet):
    """API endpoint that allows for ToolDefinitions to be fetched"""

    queryset = ToolDefinition.objects.all()
    serializer_class = ToolDefinitionSerializer
    lookup_field = 'uuid'
    http_method_names = ['get']
    permission_classes = [IsAuthenticated]


class VisualizationContainerViewSet(ModelViewSet):
    """API endpoint that allows for VisualizationContainers to be launched
    and fetched"""

    queryset = VisualizationContainer.objects.all()
    serializer_class = VisualizationContainerSerializer
    lookup_fields = ['uuid', 'container_name']
    http_method_names = ['get', 'post']
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Validate incoming payload
        with open("tool_manager/schemas/VisualizationContainer.json") as f:
            schema = json.loads(f.read())
            try:
                validate(request.data, schema)
            except ValidationError as e:
                logger.error(e)
                return HttpResponseBadRequest(content=e)

            validated_data = request.data
            visualization_container \
                = VisualizationContainer.objects.create(
                    image_name=validated_data["image_name"],
                    container_name=validated_data["container_name"]
                )

            container = DockerContainerSpec(
                image_name=visualization_container.image_name,
                container_name=visualization_container.container_name,
                labels={visualization_container.uuid: "cool"}
            )

            try:
                container.run()
            except APIError as e:
                return HttpResponseServerError(content=e)
            else:
                return redirect(visualization_container.get_absolute_url())
