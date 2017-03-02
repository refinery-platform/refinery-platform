import logging
from django.contrib import admin

from factory_boy.django_model_factories import (FileRelationshipFactory,
                                                InputFileFactory,
                                                ToolDefinitionFactory)
from file_store.models import FileType
logger = logging.getLogger(__name__)


class AdminFieldPopulator(admin.ModelAdmin):
    """
    Wrapper around ModelAdmin that exposes all of a Model's fields in admin ui
    """
    def __init__(self, model, admin_site):
        super(AdminFieldPopulator, self).__init__(model, admin_site)
        self.list_display = [field.name for field in model._meta.fields]


def create_tool_definition_from_workflow(workflow_data):
    """
    :param workflow_data: dict of annotated data coming from a Galaxy workflow
    """

    file_relationship = create_nesting(workflow_data["annotation"])

    ToolDefinitionFactory(
        name=workflow_data["name"],
        description="{} description".format(workflow_data["name"]),
        tool_type="WORKFLOW",
        file_relationship=file_relationship
    )


def create_nesting(d, fr_store=None):
    """
    :param d: dict to act recursively upon to build the proper
    FileRelationship structure

    :param fr_store: initially `None`, but becomes a populated list upon
    recursive calls to create_nesting. Allows for temp
    storage of FileRelationship objs created in this method.
    Is necessary due to the fact that we cannot properly create the M2M
    relations between FileRelationships until we have created the
    "bottom-most" one.

    :return: The top-most FileRelationship object
    """

    if not fr_store:
        fr_store = []

    for key, value in d.iteritems():
        if key == "file_relationship":
            # If the file_relationship has a nested file_relationship,
            # create a FileRelationship object, and recursively call
            # create_nesting() with said nested dict
            if isinstance(value, dict):
                file_relationship = FileRelationshipFactory(
                    name=d[key]["name"],
                    value_type=d[key]["value_type"])

                # Add FileRelationship obj to array that we'll pass to
                # subsequent recursive calls. This is where we will
                # temporarily store our FileRelationship objs until we reach
                # the bottom-most nesting.
                fr_store.append(file_relationship)
                # NOTE: Recursive functions need to return themselves,
                # otherwise Python returns `None`
                return create_nesting(
                    value, fr_store=fr_store)
            else:
                # If we reach here, we have reached the bottom-most nested
                # file_relationship.
                # Since we want to act upon the bottom-most
                # file_relationship's input_files, we can safely grab the
                # last element from our fr_store due to Python's nature or
                # ordering lists.
                bottom_file_relationship = fr_store[-1]

                # Fetch, create, and associate InputFiles with the
                # bottom-most file_relationship
                if d["input_files"]:
                    for input_file in d["input_files"]:

                        input_file_instance = InputFileFactory(
                            name=input_file["name"],
                            description=input_file["description"])

                        allowed_filetypes = input_file["allowed_filetypes"]

                        for key in allowed_filetypes:
                            # NOTE: we are not handling the usual .get()
                            # exceptions here due to the transaction
                            # management wrapping
                            # create_tool_definition_from_workflow()
                            file_type = FileType.objects.get(name=key["name"])

                            input_file_instance.allowed_filetypes.add(
                                file_type)
                            bottom_file_relationship.input_files.add(
                                input_file_instance)

                # Iterate through stored FileRelationship objects and
                # associate their children
                for idx, f in enumerate(fr_store):
                    try:
                        f.file_relationship.add(fr_store[idx + 1])
                    except IndexError:
                        # Return the top-most FileRelationship
                        return fr_store[0]
