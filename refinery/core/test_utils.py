from django.contrib.sites.models import Site
from django.test import TestCase, override_settings

from .utils import get_absolute_url, is_absolute_url


class TestIsAbsoluteURL(TestCase):

    def test_is_absolute_http_url(self):
        self.assertTrue(is_absolute_url('http://example.org'))

    def test_is_absolute_ftp_url(self):
        self.assertTrue(is_absolute_url('ftp://example.org'))

    def test_is_not_absolute_url(self):
        self.assertFalse(is_absolute_url('/path/to/file'))
        self.assertFalse(is_absolute_url('example.org'))

    def test_is_absolute_url_with_empty_input(self):
        self.assertFalse(is_absolute_url(None))
        self.assertFalse(is_absolute_url(''))


@override_settings(REFINERY_URL_SCHEME='http')
class TestGetAbsoluteURL(TestCase):

    def setUp(self):
        self.current_site = Site.objects.get_or_create(name='Test',
                                                       domain='example.org')[0]

    def test_get_absolute_url_with_relative_url(self):
        with override_settings(SITE_ID=self.current_site.id):
            self.assertEqual(get_absolute_url('/path/to/file'),
                             'http://example.org/path/to/file')

    def test_get_absolute_url_with_absolute_url(self):
        with override_settings(SITE_ID=self.current_site.id):
            self.assertEqual(get_absolute_url('http://example.org'),
                             'http://example.org')

    def test_get_absolute_url_with_empty_input(self):
        with override_settings(SITE_ID=self.current_site.id):
            self.assertEqual(get_absolute_url(None), None)
            self.assertEqual(get_absolute_url(''), '')

    def test_get_absolute_url_with_invalid_current_site(self):
        Site.objects.all().delete()
        self.assertIsNone(get_absolute_url('/path/to/file'))
