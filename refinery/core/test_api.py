from django.contrib.auth.models import User

from tastypie.test import ResourceTestCase


class LoginResourceTestCase(ResourceTestCase):

    def setUp(self):
        super(LoginResourceTestCase, self).setUp()
        self.username = self.password = 'user'
        self.user = User.objects.create_user(self.username, '', self.password)
        self.username2 = self.password2 = 'user2'
        self.user2 = User.objects.create_user(self.username2, '',
                                              self.password2)
        self.get_credentials()

    def get_credentials(self):
        """Authenticate as self.user"""
        # workaround required to use SessionAuthentication
        # http://javaguirre.net/2013/01/29/using-session-authentication-tastypie-tests/
        return self.api_client.client.login(username=self.username,
                                            password=self.password)
