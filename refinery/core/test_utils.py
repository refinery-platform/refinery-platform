from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.http import Http404
from django.test import TestCase, override_settings

from factory_boy.utils import create_dataset_with_necessary_models

from .models import ExtendedGroup
from .utils import (build_absolute_url, is_absolute_url,
                    get_non_manager_groups_for_user, get_data_set_for_view_set,
                    get_group_for_view_set)


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

    def test_build_absolute_url_with_relative_url(self):
        with override_settings(SITE_ID=self.current_site.id):
            self.assertEqual(build_absolute_url('/path/to/file'),
                             'http://example.org/path/to/file')

    def test_build_absolute_url_with_absolute_url(self):
        with override_settings(SITE_ID=self.current_site.id):
            self.assertEqual(build_absolute_url('http://example.org'),
                             'http://example.org')

    def test_build_absolute_url_with_empty_input(self):
        with self.assertRaises(ValueError):
            build_absolute_url(None)

    def test_build_absolute_url_with_invalid_current_site(self):
        Site.objects.all().delete()
        with self.assertRaises(RuntimeError):
            build_absolute_url('/path/to/file')


class SimpleUtilitiesTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('managerJane',
                                             'jane@fake.com',
                                             'test1234')
        self.lab_group = ExtendedGroup.objects.create(name="Lab Group")
        self.non_lab_group = ExtendedGroup.objects.create(name="Test Group")
        self.lab_group.user_set.add(self.user)
        self.non_lab_group.user_set.add(self.user)
        self.lab_group.manager_group.user_set.add(self.user)

    def test_only_non_manager_groups_return_correct_number(self):
        self.assertEqual(4, len(self.user.groups.all()))
        self.assertEqual(3, len(get_non_manager_groups_for_user(self.user)))

    def test_only_non_manager_groups_returned(self):
        for group in get_non_manager_groups_for_user(self.user):
            self.assertFalse(group.extendedgroup.is_manager_group())


class GetDataSetForViewSetTest(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username,
                                             'user@example.com',
                                             self.password)
        self.data_set = create_dataset_with_necessary_models(user=self.user)

    def test_get_data_set_for_view_set_returns_data_set(self):
        data_set = get_data_set_for_view_set(self.data_set.uuid)
        self.assertEqual(data_set, self.data_set)

    def test_get_data_set_for_view_set_raises_404(self):
        with self.assertRaises(Http404):
            get_data_set_for_view_set('xxxxx7')


class GetGroupForViewSetTest(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username,
                                             'user@example.com',
                                             self.password)
        self.group = ExtendedGroup.objects.create(name="Test Group")
        self.group.manager_group.user_set.add(self.user)
        self.group.user_set.add(self.user)

    def test_get_group_for_view_set_returns_data_set(self):
        group = get_group_for_view_set(self.group.uuid)
        self.assertEqual(group, self.group)

    def test_get_group_for_view_set_raises_404(self):
        with self.assertRaises(Http404):
            get_group_for_view_set('xxxxx7')
