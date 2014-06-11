from bioblend import galaxy
from django.db import models
from galaxy_connector.connection import Connection
from galaxy_connector.galaxy_workflow import GalaxyWorkflow
from galaxy_connector.galaxy_workflow import GalaxyWorkflowInput


class Instance(models.Model):
    base_url = models.CharField(max_length=2000)
    data_url = models.CharField(max_length=100, default="datasets")
    api_url = models.CharField( max_length=100, default="api")
    api_key = models.CharField(max_length=50)
    description = models.CharField(max_length=500, default="",
                                   null=True, blank=True)
    local_download = models.BooleanField(default=False)

    def __unicode__(self):
        return self.description + " (" + self.api_key + ")"

    def galaxy_connection(self):
        return galaxy.GalaxyInstance(url=self.base_url, key=self.api_key)

    def get_galaxy_connection(self):
        # to be deprecated in favor of galaxy_connection()
        return Connection(
            self.base_url, self.data_url, self.api_url, self.api_key)

    def get_complete_workflows(self):
        connection = self.galaxy_connection()
        workflows = []
        for workflow_entry in connection.workflows.get_workflows():
            workflow = GalaxyWorkflow(workflow_entry['name'], workflow_entry['id'])
            # get workflow inputs
            workflow_inputs = connection.workflows.show_workflow(workflow.identifier)['inputs']
            for input_identifier, input_description in workflow_inputs.items():
                workflow_input = GalaxyWorkflowInput(
                    input_description['label'], input_identifier)
                workflow.add_input(workflow_input)
            workflows.append(workflow)
        return workflows
