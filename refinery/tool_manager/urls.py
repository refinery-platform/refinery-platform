from django.conf import settings
from django.conf.urls import include, url

from rest_framework.routers import DefaultRouter

from .views import ToolDefinitionsViewSet, ToolsViewSet, VisualizationToolProxy

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet)
tool_manager_router.register(
    r'tool_definitions',
    ToolDefinitionsViewSet,
    base_name="tooldefinition"
)

django_docker_engine_url = url(
    r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
    include(VisualizationToolProxy().url_patterns())
)
