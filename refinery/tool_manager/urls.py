from django.conf import settings
from django.conf.urls import include, url

from rest_framework.routers import DefaultRouter

from .views import (AutoRelaunchProxy, ISATabExportViewSet,
                    ToolDefinitionsViewSet, ToolsViewSet)


# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet, base_name="tools")
tool_manager_router.register(
    r'tool_definitions',
    ToolDefinitionsViewSet,
    base_name="tooldefinitions"
)
tool_manager_router.urls.extend([
    url(r'^isa_tab_export/$',
        ISATabExportViewSet.as_view({"get": "export_isa_tab_to_zip"}))
])

django_docker_engine_url = url(
    r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
    include(AutoRelaunchProxy().url_patterns())
)
