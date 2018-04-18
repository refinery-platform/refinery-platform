from django.conf import settings

from celery.task import task
from django_docker_engine.docker_utils import DockerClientWrapper
from docker.errors import APIError


@task()
def django_docker_cleanup():
    # TODO: Specify manager, if not default
    DockerClientWrapper().purge_inactive(
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE
    )


@task(ignore_result=True, throws=(APIError,))
def start_container(visualization_tool):
    """Start a VisualizationTool's container. docker.errors.APIError is
    expected if a VisualizationTool is launched more than once.
    """
    visualization_tool.django_docker_client.run(
        visualization_tool.create_container_spec()
    )
