from rest_framework.routers import DefaultRouter
from .views import ToolDefinitionsViewSet

# DRF url routing
router = DefaultRouter()
router.register(r'tools/definitions', ToolDefinitionsViewSet)
