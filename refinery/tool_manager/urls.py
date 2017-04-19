from django.conf.urls import url, include
from rest_framework.routers import DefaultRouter
from .views import ToolDefinitionsViewSet, ToolViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools/definitions', ToolDefinitionsViewSet)
tool_manager_router.register(r'tools', ToolViewSet)

# Django docker engine urls
tool_manager_router.urls.extend(
    [url(r'^docker/', include('django_docker_engine.urls'))]
)
