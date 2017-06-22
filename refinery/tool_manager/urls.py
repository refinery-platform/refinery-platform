from django.conf import settings
from django.conf.urls import include, url
from django_docker_engine.proxy import FileLogger, Proxy
from rest_framework.routers import DefaultRouter

from .views import ToolDefinitionsViewSet, ToolsViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet)
tool_manager_router.register(r'tool_definitions', ToolDefinitionsViewSet)

url_patterns = Proxy(FileLogger(settings.PROXY_LOG)).url_patterns()
django_docker_engine_url = url(
    r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
    include(url_patterns)
)
