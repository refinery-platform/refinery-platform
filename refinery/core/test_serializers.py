from datetime import datetime
from datetime import timedelta
import uuid as uuid_lib

from django.conf import settings
from django.utils import timezone
from django.test.testcases import TestCase
from guardian.compat import get_user_model
from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import create_dataset_with_necessary_models

from .models import (Analysis, Assay, DataSet, ExtendedGroup, Investigation,
                     InvestigationLink, Invitation, Project, Study, Workflow,
                     WorkflowEngine)

from .serializers import (AnalysisSerializer, DataSetSerializer,
                          DateTimeWithTimeZone, InvitationSerializer)

User = get_user_model()


class AnalysisSerializerTests(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username,
                                             'user@example.com',
                                             self.password)
        self.project = Project.objects.create()
        self.galaxy_instance = GalaxyInstanceFactory()
        self.workflow_engine = WorkflowEngine.objects.create(
            instance=self.galaxy_instance
        )
        self.workflow = Workflow.objects.create(
            workflow_engine=self.workflow_engine
        )

        # Create Datasets
        self.data_set = DataSet.objects.create(name="coffee data_set")
        self.data_set.set_owner(self.user)

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()
        InvestigationLink.objects.create(data_set=self.data_set,
                                         investigation=self.investigation,
                                         version=1)

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        # Create Analyses
        self.analysis = Analysis.objects.create(
            name='Coffee Analysis',
            summary='coffee',
            project=self.project,
            data_set=self.data_set,
            workflow=self.workflow,
            time_start=timezone.now()
        )
        self.analysis.set_owner(self.user)
        self.serializer = AnalysisSerializer(self.analysis)

    def test_serializer_returns_data_set_uuid(self):
        self.assertEqual(self.serializer.data.get('data_set_uuid'),
                         self.data_set.uuid)

    def test_serializer_returns_facet_name(self):
        self.assertEqual(self.serializer.data.get('facet_name'),
                         self.analysis.facet_name())

    def test_serializer_returns_name(self):
        self.assertEqual(self.serializer.data.get('name'),
                         self.analysis.name)

    def test_serializer_returns_owner(self):
        self.assertEqual(self.serializer.data.get('owner').get('id'),
                         self.analysis.get_owner().id)

    def test_serializer_returns_status(self):
        self.assertEqual(self.serializer.data.get('status'),
                         self.analysis.status)

    def test_serializer_returns_summary(self):
        self.assertEqual(self.serializer.data.get('summary'),
                         self.analysis.summary)

    def test_serializer_returns_time_start(self):
        isoformat = datetime.isoformat(
            timezone.localtime(self.analysis.time_start)
        )
        self.assertEqual(self.serializer.data.get('time_start'), isoformat)

    def test_serializer_returns_time_end(self):
        self.assertEqual(self.serializer.data.get('time_end'),
                         self.analysis.time_end)

    def test_serializer_returns_uuid(self):
        self.assertEqual(self.serializer.data.get('uuid'),
                         self.analysis.uuid)

    def test_serializer_returns_workflow(self):
        self.assertEqual(self.serializer.data.get('workflow'),
                         self.analysis.workflow.id)


class DataSetSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('JaneDoe',
                                             'user@example.com',
                                             'test1234')
        self.data_set = create_dataset_with_necessary_models(user=self.user)

    def test_serializer_returns_creation_date(self):
        serializer = DataSetSerializer(self.data_set)
        isoformat = datetime.isoformat(self.data_set.creation_date)
        drf_isoformat_creation_date = isoformat[:-6] + 'Z'
        self.assertEqual(serializer.data.get('creation_date'),
                         drf_isoformat_creation_date)

    def test_serializer_returns_version_field(self):
        serializer = DataSetSerializer(self.data_set)
        self.assertEqual(serializer.data.get('version'),
                         self.data_set.get_version())


class DateTimeWithTimeZoneTests(TestCase):
    def test_returns_localtime(self):
        utc_time = timezone.now()
        # isoformat is DRF default
        expected_local_time = datetime.isoformat(timezone.localtime(utc_time))
        self.assertEqual(DateTimeWithTimeZone().to_representation(utc_time),
                         expected_local_time)


class InvitationSerializerTests(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, 'user@example.com',
                                             self.password)
        self.group = ExtendedGroup.objects.create(name="Test Group")
        self.group.manager_group.user_set.add(self.user)
        self.group.user_set.add(self.user)
        self.public_group = ExtendedGroup.objects.public_group()
        self.public_group.manager_group.user_set.add(self.user)
        self.invite = Invitation(token_uuid=uuid_lib.uuid4(),
                                 group_id=self.group.id)
        self.time_duration = timedelta(days=settings.TOKEN_DURATION)
        self.invite.expires = timezone.now() + self.time_duration
        self.invite.sender = self.user
        self.invite.recipient_email = 'non_member@example.com'
        self.invite.save()

    def test_serializer_returns_created_field(self):
        serializer = InvitationSerializer(self.invite)
        isoformat = datetime.isoformat(self.invite.created)
        drf_isoformat = isoformat[:-6] + 'Z'
        self.assertEqual(drf_isoformat,
                         serializer.data.get('created'))

    def test_serializer_returns_expires_field(self):
        serializer = InvitationSerializer(self.invite)
        isoformat = datetime.isoformat(self.invite.expires)
        drf_isoformat = isoformat[:-6] + 'Z'
        self.assertEqual(drf_isoformat,
                         serializer.data.get('expires'))

    def test_serializer_returns_group_id_field(self):
        serializer = InvitationSerializer(self.invite)
        self.assertEqual(self.invite.group_id, serializer.data.get('group_id'))

    def test_serializer_returns_id_field(self):
        serializer = InvitationSerializer(self.invite)
        self.assertEqual(self.invite.id, serializer.data.get('id'))

    def test_serializer_returns_recipient_email_field(self):
        serializer = InvitationSerializer(self.invite)
        self.assertEqual(self.invite.recipient_email,
                         serializer.data.get('recipient_email'))
