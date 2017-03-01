from rest_framework.routers import DefaultRouter
from .views import ToolDefinitionsViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools/definitions', ToolDefinitionsViewSet)
