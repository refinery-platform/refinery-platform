import logging

from django.conf import settings

from celery.task import on_after_configure, task
from django_docker_engine.docker_utils import DockerClientWrapper

logger = logging.getLogger(__name__)


# TODO?
@on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(docker_garbage_collection.s(
            settings.DJANGO_DOCKER_ENGINE_SECONDS_INACTIVE
    ))


@task()
def docker_garbage_collection(seconds_inactive):
    client = DockerClientWrapper()  # TODO: manager= ?
    client.purge_inactive(seconds_inactive)
