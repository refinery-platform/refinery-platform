from rest_framework.routers import DefaultRouter
from .views import AllFilesViewSet

# DRF url routing
all_files_manager_router = DefaultRouter()
all_files_manager_router.register(r'all_files', AllFilesViewSet)
