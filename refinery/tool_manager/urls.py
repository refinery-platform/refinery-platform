from django.conf.urls import url, include
from rest_framework.routers import DefaultRouter
from .views import ToolDefinitionsViewSet, ToolsViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet)
tool_manager_router.register(r'tool_definitions', ToolDefinitionsViewSet)

# Django docker engine urls
django_docker_engine_url = url(
    r'^visualizations/', include('django_docker_engine.urls')
)
