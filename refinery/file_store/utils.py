import logging
from celery.task.control import revoke

logger = logging.getLogger(__name__)


def terminate_file_import_task(import_task_id):
    """ Trys to terminate a celery file_import task based on a
    FileStoreItem's import_task_id field.

    :param import_task_id: A FileStoreItem's import task id

    NOTE: That if you simply revoke() a task without the `terminate` ==
    True, said task will try to restart upon a Worker restart.

    See: http://bit.ly/2di038U or http://bit.ly/1qb8763
    """
    try:
        revoke(import_task_id, terminate=True)
    except Exception as e:
        logger.debug(
            "Something went wrong while trying to terminate Task with id %s. "
            "This is most likely due to there being no current file_import "
            "task associated. %s",
            import_task_id,
            e
        )
