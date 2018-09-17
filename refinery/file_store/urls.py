from django.conf.urls import url

from constants import UUID_RE
from rest_framework.routers import DefaultRouter

from file_store.views import FileStoreItems

# DRF url routing
file_store_router = DefaultRouter()
file_store_router.urls.extend([
    url(r'^file_store_items/(?P<uuid>' + UUID_RE + r')/$',
        FileStoreItems.as_view())
])
