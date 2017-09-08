from django.conf import settings

from celery.task import task
from django_docker_engine.docker_utils import DockerClientWrapper


@task()
def docker_garbage_collection():
    # TODO: Specify manager, if not default
    client = DockerClientWrapper()
    client.purge_inactive(settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE)
