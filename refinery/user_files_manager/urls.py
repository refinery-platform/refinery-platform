from django.conf.urls import url
from rest_framework.routers import DefaultRouter

user_files_router = DefaultRouter()
user_files_router.urls.extend([
    url(r'^user/files/$', 'user_files_manager.views.user_files')
])
