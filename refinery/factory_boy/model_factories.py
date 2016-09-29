import os
import sys
import uuid
from datetime import datetime

import factory

sys.path.append("../refinery/")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")


class DataSetFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a DataSet for testing purposes"""
    class Meta:
        model = "core.DataSet"

    uuid = uuid.uuid4()
    title = "Test DataSet - {}".format(uuid)
    creation_date = datetime.now()
    modification_date = datetime.now()


class NodeCollectionFactory(factory.django.DjangoModelFactory):
    """Minimal representation of a NodeCollection for testing purposes"""
    class Meta:
        model = "data_set_manager.NodeCollection"

    uuid = uuid.uuid4()


class InvestigationFactory(factory.Factory):
    """Minimal representation of an Investigation for testing purposes"""
    class Meta:
        model = "core.Investigation"


class InvestigationLinkFactory(factory.django.DjangoModelFactory):
    """Minimal representation of an InvestigationLink for testing purposes"""
    class Meta:
        model = "core.InvestigationLink"

    data_set = factory.SubFactory(DataSetFactory)
    investigation = factory.SubFactory(InvestigationFactory)
    version = 1
    date = datetime.now()


def make_datasets(number_to_create):
    """Create some DataSets"""
    while number_to_create:
        NodeCollectionFactory()
        InvestigationLinkFactory()
        number_to_create -= 1
