from django.conf import settings

from celery.task import task
from django_docker_engine.docker_utils import DockerClientWrapper
import docker


@task()
def django_docker_cleanup():
    # TODO: Specify manager, if not default
    DockerClientWrapper().purge_inactive(
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE
    )
    # Remove volumes not associated with a container.
    # NOTE: this functionality is provided by django-docker-engine >= 0.0.52
    client = docker.from_env()
    client.volumes.prune()


@task(ignore_result=True, throws=(docker.errors.APIError,))
def start_container(visualization_tool):
    """Start a VisualizationTool's container. docker.errors.APIError is
    expected if a VisualizationTool is launched more than once.
    """
    visualization_tool.django_docker_client.run(
        visualization_tool.create_container_spec()
    )
