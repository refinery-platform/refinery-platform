from celery.task import task
import docker
import logging
import Exception

logger = logging.getLogger(__name__)


@task(ignore_result=True, throws=(docker.errors.APIError,))
def start_container(visualization_tool):
    """Start a VisualizationTool's container. docker.errors.APIError is
    expected if a VisualizationTool is launched more than once.
    """
    logger.debug('>>> pre spec')
    spec = visualization_tool.create_container_spec()
    logger.debug('>>> post spec')

    logger.debug('>>> pre django_docker_client.run')
    try:
        visualization_tool.django_docker_client.run(spec)
    except Exception as e:
        logger.debug('>>> except {}'.format(e))
        raise
    logger.debug('>>> post django_docker_client.run')
