from django.db import models

from bioblend import galaxy

from galaxy_connector.galaxy_workflow import (GalaxyWorkflow,
                                              GalaxyWorkflowInput)


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

    def get_complete_workflows(self):
        connection = self.galaxy_connection()
        workflows = []
        for workflow_entry in connection.workflows.get_workflows():
            workflow = GalaxyWorkflow(workflow_entry['name'],
                                      workflow_entry['id'])
            # get workflow inputs
            workflow_inputs = connection.workflows.show_workflow(
                workflow.identifier)['inputs']
            for input_identifier, input_description in workflow_inputs.items():
                workflow_input = GalaxyWorkflowInput(
                    input_description['label'], input_identifier)
                workflow.add_input(workflow_input)
            workflows.append(workflow)
        return workflows

    def get_history_file_list(self, history_id):
        """Returns a list of dictionaries that contain the name, type, state
        and download URL of all _files_ in a history.
        """
        files = []
        connection = self.galaxy_connection()

        for history_content_entry in connection.histories.show_history(
                history_id, contents=True):

            if "type" not in history_content_entry:
                continue

            if history_content_entry["type"] != "file":
                continue

            file_info = {
                "name": history_content_entry["name"],
                "url": history_content_entry["url"]
            }
            history_content = connection.histories.show_dataset(
                history_id, history_content_entry["id"])

            if "file_ext" not in history_content:
                file_info["type"] = None
            else:
                file_info["type"] = history_content["file_ext"]

            if "state" not in history_content:
                file_info["state"] = None
            else:
                file_info["state"] = history_content["state"]

            if "id" not in history_content:
                file_info["dataset_id"] = None
            else:
                file_info["dataset_id"] = history_content["id"]

            if "file_size" not in history_content:
                file_info["file_size"] = None
            else:
                file_info["file_size"] = history_content["file_size"]

            if "visible" not in history_content:
                file_info["visible"] = None
            else:
                file_info["visible"] = history_content["visible"]

            if "file_name" not in history_content:
                file_info["file_name"] = None
            else:
                file_info["file_name"] = history_content["file_name"]

            if "genome_build" not in history_content:
                file_info["genome_build"] = None
            else:
                file_info["genome_build"] = history_content["genome_build"]

            if "misc_info" not in history_content:
                file_info["misc_info"] = None
            else:
                file_info["misc_info"] = history_content["misc_info"]

            if "misc_blurb" not in history_content:
                file_info["misc_blurb"] = None
            else:
                file_info["misc_blurb"] = history_content["misc_blurb"]

            files.append(file_info)

        return files
