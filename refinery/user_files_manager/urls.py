from django.conf.urls import url

from . import views

user_files_api_urls = [
    url(r'^files/$', views.UserFileAPIView.as_view())
]
