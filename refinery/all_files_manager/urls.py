from django.conf.urls import url
from rest_framework.routers import DefaultRouter

all_files_router = DefaultRouter()
all_files_router.urls.extend([
    url(r'^all_files/$', 'all_files_manager.views.all_files')
])
