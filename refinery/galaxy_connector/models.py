import logging

from django.db import models

from bioblend import galaxy

logger = logging.getLogger(__name__)

error_msg = "Error deleting Galaxy %s for analysis '%s': %s"


class Instance(models.Model):
    base_url = models.CharField(max_length=2000)
    data_url = models.CharField(max_length=100, default="datasets")
    api_url = models.CharField(max_length=100, default="api")
    api_key = models.CharField(max_length=50)
    description = models.CharField(max_length=500, default="",
                                   null=True, blank=True)
    local_download = models.BooleanField(default=False)

    def __unicode__(self):
        return self.description + " (" + self.api_key + ")"

    def galaxy_connection(self):
        return galaxy.GalaxyInstance(url=self.base_url, key=self.api_key)

    def get_history_file_list(self, history_id):
        """Returns a list of dictionaries that contain the name, type, state
        and download URL of all _files_ in a history.
        """
        files = []
        connection = self.galaxy_connection()
        history_content_keys = ["state", "file_size", "visible",
                                "file_name", "genome_build", "misc_info",
                                "misc_blurb"]
        history_contents = connection.histories.show_history(history_id,
                                                             contents=True)

        for history_content_entry in history_contents:
            if ("type" not in history_content_entry or
                    history_content_entry["type"] != "file"):
                continue

            history_content = connection.histories.show_dataset(
                history_id, history_content_entry["id"]
            )

            file_info = {
                "name": history_content_entry["name"],
                "url": history_content_entry["url"],
                "type": history_content.get("file_ext"),
                "dataset_id": history_content.get("id")
            }

            for history_content_key in history_content_keys:
                file_info[history_content_key] = history_content.get(
                    history_content_key
                )

            files.append(file_info)
        return files

    def delete_history(self, history_id, analysis_name):
        try:
            self.galaxy_connection().histories.delete_history(history_id,
                                                              purge=True)
        except galaxy.client.ConnectionError as e:
            logger.error(error_msg, 'history', analysis_name, e.message)

    def delete_library(self, library_id, analysis_name):
        try:
            self.galaxy_connection().libraries.delete_library(library_id)
        except galaxy.client.ConnectionError as e:
            logger.error(error_msg, 'library', analysis_name, e.message)
