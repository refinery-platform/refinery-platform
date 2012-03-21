from celery.task import task

@task()
def grab_workflows():
    #import needed packages and modules
    from galaxy_connector.galaxy_workflow import GalaxyWorkflow, GalaxyWorkflowInput
    from galaxy_connector.models import Instance
    from galaxy_connector.connection import Connection
    from core.models import Workflow, WorkflowDataInput

    #get instance
    instance = Instance.objects.all()[0]
    #get conenction
    connection = Connection(instance.base_url, instance.data_url, 
                            instance.api_url, instance.api_key)
    #get all your workflows
    workflows = connection.get_complete_workflows()

    #for each workflow, create a core Workflow object and its associated 
    #WorkflowDataInput objects
    for workflow in workflows:
        workflow_dict = {
                         'name': workflow.name,
                         'internal_id': workflow.identifier,
                         'visibility': 2 #give public visibility for now
                         }
        w = Workflow(**workflow_dict)
        w.save()

        inputs = workflow.inputs
        for input in inputs:
            input_dict = {
                          'name': input.name,
                          'internal_id': input.identifier
                          }
            i = WorkflowDataInput(**input_dict)
            i.save()
            w.data_inputs.add(i)