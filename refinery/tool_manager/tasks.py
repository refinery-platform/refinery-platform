from django.conf import settings

from celery.task import task
from django_docker_engine.docker_utils import DockerClientWrapper


@task()
def django_docker_cleanup():
    # TODO: Specify manager, if not default
    DockerClientWrapper().purge_inactive(
        settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE
    )
