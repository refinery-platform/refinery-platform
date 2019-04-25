from rest_framework.routers import DefaultRouter

from .views import ToolDefinitionsViewSet, ToolsViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet, base_name='tools')
tool_manager_router.register(r'tool_definitions', ToolDefinitionsViewSet,
                             base_name='tooldefinitions')
