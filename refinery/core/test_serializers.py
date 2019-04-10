from datetime import datetime
from datetime import timedelta
import uuid

from django.conf import settings
from django.test.testcases import TestCase
from guardian.compat import get_user_model
from django.utils import timezone

from .models import ExtendedGroup, Invitation
from .serializers import InvitationSerializer

User = get_user_model()


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
        self.invite = Invitation(token_uuid=uuid.uuid1(),
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
