from django.conf.urls import url

from constants import UUID_RE
from file_store.views import FileStoreItems

file_store_api_urls = [
    url(r'^file_store_items/(?P<uuid>' + UUID_RE + r')/$',
        FileStoreItems.as_view())
]
