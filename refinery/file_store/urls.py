from django.conf.urls import url
from rest_framework.routers import DefaultRouter

from file_store.views import FileStoreItems

# DRF url routing
file_store_router = DefaultRouter()
file_store_router.urls.extend([
    url(r'^file_store_items/(?P<uuid>'
        r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{'
        r''r'12})/$', FileStoreItems.as_view())
])
