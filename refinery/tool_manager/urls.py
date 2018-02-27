from django.conf import settings
from django.conf.urls import include, url

from django_docker_engine.proxy import Proxy
from rest_framework.routers import DefaultRouter

from .views import ToolDefinitionsViewSet, ToolsViewSet

# DRF url routing
tool_manager_router = DefaultRouter()
tool_manager_router.register(r'tools', ToolsViewSet)
tool_manager_router.register(
    r'tool_definitions',
    ToolDefinitionsViewSet,
    base_name="tooldefinition"
)

url_patterns = Proxy(
    settings.DJANGO_DOCKER_ENGINE_DATA_DIR,
    please_wait_title='Please wait...',
    please_wait_body_html='''
        <style>
        body {{
          font-family: "Source Sans Pro",Helvetica,Arial,sans-serif;
          font-size: 40pt;
          text-align: center;
        }}
        div {{
          position: absolute;
          top: 50%;
          left: 50%;
          margin-right: -50%;
          transform: translate(-50%, -50%)
        }}
        </style>

        <div>
        <img src="{0}/logo.svg" width='150'>
        <p>Please wait...</p>
        <img src="{0}/spinner.gif">
        </div>
    '''.format(settings.STATIC_URL + 'images')  # noqa
).url_patterns()
django_docker_engine_url = url(
    r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
    include(url_patterns)
)
