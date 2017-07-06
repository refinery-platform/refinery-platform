from django.conf.urls import url

from rest_framework.routers import DefaultRouter

from .views import UserFiles

user_files_router = DefaultRouter()
user_files_router.urls.extend([
    url(r'^user/files/$', UserFiles.as_view())  # Rooted under /api/v2
])
user_files_url = url(r'^user/files/$',
                     'user_files_manager.views.user_files',
                     name="user_files")
user_files_csv_url = url(r'^user/files.csv$',
                         'user_files_manager.views.user_files_csv',
                         name="user_files_csv")
