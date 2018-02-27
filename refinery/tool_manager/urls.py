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
        body {
          font-family: "Source Sans Pro",Helvetica,Arial,sans-serif;
          font-size: 40pt;
          text-align: center;
        }
        div {
          position: absolute;
          top: 50%;
          left: 50%;
          margin-right: -50%;
          transform: translate(-50%, -50%)
        }
        </style>

        <main>
        <div>
        <img src="https://camo.githubusercontent.com/c4f6ef3406a9c83a537432b129ad99240afcee7a/68747470733a2f2f7062732e7477696d672e636f6d2f70726f66696c655f696d616765732f3531393530353635323038333734383836342f62473969744c546c5f343030783430302e706e67" width='150'>
        <p>Please wait...</p>
        <img width='150' src="https://user-images.githubusercontent.com/730388/36614998-b24d66ea-18ac-11e8-82f9-75542932b452.gif">
        </div>
        </main>
    '''  # noqa
).url_patterns()
django_docker_engine_url = url(
    r'^{}/'.format(settings.DJANGO_DOCKER_ENGINE_BASE_URL),
    include(url_patterns)
)
