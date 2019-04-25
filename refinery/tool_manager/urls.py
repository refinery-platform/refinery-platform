from rest_framework.routers import DefaultRouter

from . import views

# DRF url routing
router = DefaultRouter()
router.register(r'tools', views.ToolsViewSet, base_name='tools')
router.register(r'tool_definitions', views.ToolDefinitionsViewSet,
                base_name='tooldefinitions')

tool_manager_api_urls = router.urls
