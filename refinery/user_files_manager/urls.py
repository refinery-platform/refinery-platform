from django.conf.urls import url

from rest_framework.routers import DefaultRouter

from .views import UserFiles

user_files_router = DefaultRouter()
user_files_router.urls.extend([
    url(r'^files/$', UserFiles.as_view())
])
