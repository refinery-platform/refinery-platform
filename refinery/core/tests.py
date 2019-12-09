import re

from django.apps import apps
from django.contrib.auth.models import Group, User
from django.contrib.sites.models import Site
from django.core.management import CommandError, call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase
from django.utils import timezone

import mockcache as memcache

from data_set_manager.models import Assay, Contact, Investigation, Study
from factory_boy.django_model_factories import GalaxyInstanceFactory
from factory_boy.utils import create_dataset_with_necessary_models

from .models import (DataSet, ExtendedGroup, WorkflowEngine,
                     invalidate_cached_object)
from .search_indexes import DataSetIndex
from .utils import get_aware_local_time

cache = memcache.Client(["127.0.0.1:11211"])


class CachingTest(TestCase):
    """Testing the addition and deletion of cached objects"""

    def setUp(self):
        # make some data
        self.username = self.password = 'Cool'
        self.user = User.objects.create_user(
            self.username, '', self.password
        )
        self.username1 = self.password1 = 'Cool1'
        self.user1 = User.objects.create_user(
            self.username1, '', self.password1
        )
        self.public_group_name = ExtendedGroup.objects.public_group().name
        for index, item in enumerate(range(0, 6)):
            create_dataset_with_necessary_models(slug="TestSlug%d" % index)
        # Adding to cache
        cache.add("{}-DataSet".format(self.user.id), DataSet.objects.all())

        # Initial data that is cached, to test against later
        self.initial_cache = cache.get("{}-DataSet".format(self.user.id))

    def tearDown(self):
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

    def test_verify_cache_invalidation(self):
        # Grab a DataSet and see if we can invalidate the cache
        ds = DataSet.objects.get(slug="TestSlug5")
        self.cache = invalidate_cached_object(ds, True)
        self.assertIsNone(self.cache.get("{}-DataSet".format(self.user.id)))

    def test_verify_data_after_save(self):
        # Grab, alter, and save an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.slug = "NewSlug"
        ds.save()

        # Invalidate cache
        self.cache = invalidate_cached_object(ds, True)

        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)
        self.assertTrue(DataSet.objects.get(slug="NewSlug"))

    def test_verify_data_after_delete(self):
        # Grab and delete an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.delete()

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)

    def test_verify_data_after_perms_change(self):
        # Grab and change sharing an object being cached
        ds = DataSet.objects.get(slug="TestSlug5")
        ds.share(group=Group.objects.get(name="Public"))

        # Invalidate cache
        self.cache = invalidate_cached_object(DataSet.objects.get(
            slug="TestSlug1"), True)

        self.assertFalse(self.cache.get("{}-DataSet".format(self.user.id)))
        # Adding to cache again
        self.cache.add("{}-DataSet".format(self.user.id),
                       DataSet.objects.all())
        new_cache = self.cache.get("{}-DataSet".format(self.user.id))

        self.assertTrue(new_cache)
        # Make sure new cache represents the altered data
        self.assertNotEqual(self.initial_cache, new_cache)


class CoreIndexTests(TestCase):
    def setUp(self):
        self.dataset_index = DataSetIndex()
        self.good_dataset = create_dataset_with_necessary_models()
        self.bad_dataset = DataSet.objects.create()

    def test_prepare(self):
        data = self.dataset_index.prepare(self.good_dataset)
        self.assertRegex(
            data['text'],
            re.compile(
                r'AnnotatedNode-\d.*AnnotatedNode-\d',
                re.DOTALL
            )
        )

    def test_prepare_submitter(self):
        contact = Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name="Scott",
            last_name="Ouellette"
        )
        # Create an identical contact to ensure we prepare a unique list of
        # submitters
        Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name="Scott",
            last_name="Ouellette"
        )
        self.good_dataset.save()

        prepared_submitters = self.dataset_index.prepare_submitter(
            self.good_dataset
        )

        self.assertEqual(
            prepared_submitters,
            ["{}, {}".format(contact.last_name, contact.first_name)]
        )

    def test_prepare_submitter_funky_contact(self):
        contact = Contact.objects.create(
            collection=self.good_dataset.get_investigation(),
            first_name='Sc\xd6tt',
            last_name='\xd6uellette'
        )
        self.good_dataset.save()

        prepared_submitters = self.dataset_index.prepare_submitter(
            self.good_dataset
        )
        self.assertEqual(
            prepared_submitters,
            ["{}, {}".format(contact.last_name, contact.first_name)]
        )

    def test_prepare_description_bad_dataset(self):
        prepared_description = self.dataset_index.prepare_description(
            self.bad_dataset
        )
        self.assertEqual(prepared_description, "")

    def test_prepare_description_good_dataset(self):
        prepared_description = self.dataset_index.prepare_description(
            self.good_dataset
        )
        self.assertEqual(
            prepared_description,
            self.good_dataset.get_investigation().get_description()
        )


class UtilitiesTest(TestCase):
    def setUp(self):
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        assay = {
            'study': self.study,
            'measurement': 'transcription factor binding site',
            'measurement_accession': 'http://www.testurl.org/testID',
            'measurement_source': 'OBI',
            'technology': 'nucleotide sequencing',
            'technology_accession': 'test info',
            'technology_source': 'test source',
            'platform': 'Genome Analyzer II',
            'file_name': 'test_assay_filename.txt'
        }
        self.assay = Assay.objects.create(**assay)
        self.valid_uuid = self.assay.uuid
        self.invalid_uuid = "03b5f681-35d5-4bdd-bc7d-8552fa777ebc"
        self.node_uuids = [
            "1a50204d-49fa-4082-a708-26ee93fb0f86",
            "32e977fc-b906-4315-b6ed-6a644d173492",
            "910117c5-fda2-4700-ae87-dc897f3a5d85"
            ]

    def test_get_aware_local_time(self):
        expected_time = timezone.localtime(timezone.now())
        response_time = get_aware_local_time()
        difference_time = response_time - expected_time

        self.assertLessEqual(difference_time.total_seconds(), .99)

    # Mock methods used in filter_nodes_uuids_in_solr
    def fake_generate_solr_params(params, assay_uuid):
        # Method should respond with a string
        return ''

    def fake_search_solr(params, str_name):
        # Method expects solr params and a str_name. It should return a string
        # For mock purpose, pass params which are included in solr_response
        return params

    def fake_format_solr_response(solr_response):
        # Method expects solr_response and returns array of uuid objs
        if '&fq=-uuid' in solr_response:
            # if uuids are passed in
            response_node_uuids = [
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        else:
            # else return all uuids
            response_node_uuids = [
                {'uuid': '1a50204d-49fa-4082-a708-26ee93fb0f86'},
                {'uuid': '32e977fc-b906-4315-b6ed-6a644d173492'},
                {'uuid': '910117c5-fda2-4700-ae87-dc897f3a5d85'},
                {'uuid': 'd2041706-ad2e-4f5b-a6ac-2122fe2a9751'},
                {'uuid': '57d2b371-a364-4806-b7ee-366a722ca9f4'},
                {'uuid': 'c9d7f81f-2274-4179-ad00-28227bf4b9b7'},
                {'uuid': 'e082ce03-0a83-4162-af5c-7472e450d7d0'},
                {'uuid': '880e60f7-7036-4468-b9c8-fdeebe7c21c3'},
                {'uuid': '945aaca7-dc58-47b8-8012-e9821249ca7a'},
                {'uuid': '2b939cb3-5b40-48c2-8df7-e5472c3bdcca'},
                {'uuid': 'd5e6fef8-d8c9-4df9-b5f0-dd757fe79f7d'}
            ]
        return {'nodes': response_node_uuids}


class TestManagementCommands(TestCase):
    def test_set_up_site_name(self):
        site_name = "Refinery Test"
        domain = "www.example.com"
        call_command('set_up_site_name', site_name, domain)

        self.assertIsNotNone(
            Site.objects.get(domain=domain, name=site_name)
        )

    def test_set_up_site_name_failure(self):
        with self.assertRaises(CommandError):
            call_command('set_up_site_name')

    def _user_in_public_group(self, user_instance):
        return bool(
            user_instance.groups.filter(
                name=ExtendedGroup.objects.public_group().name
            ).count()
        )

    def test_add_users_to_public_group(self):
        # We have a post-save hook on User for this functionality, but this
        # doesn't apply when we create the super/guest user with 'loaddata'
        # where save() is never actually called
        call_command("loaddata", "guest.json")
        user = User.objects.get(username="guest")
        self.assertFalse(self._user_in_public_group(user))

        call_command("add_users_to_public_group")
        self.assertTrue(self._user_in_public_group(user))

    def test_activate_user(self):
        guest_username = "guest"
        call_command("loaddata", "guest.json")
        user = User.objects.get(username=guest_username)
        self.assertFalse(user.is_active)

        call_command("activate_user", guest_username)
        self.assertTrue(User.objects.get(username=guest_username).is_active)

    def test_create_workflow_engine(self):
        galaxy_instance = GalaxyInstanceFactory()
        call_command(
            "create_workflowengine",
            str(galaxy_instance.id),
            ExtendedGroup.objects.public_group().name
        )
        self.assertIsNotNone(
            WorkflowEngine.objects.get(instance=galaxy_instance)
        )

    def test_create_workflow_engine_bad_galaxy_instance(self):
        with self.assertRaises(CommandError):
            call_command(
                "create_workflowengine",
                str(123),
                ExtendedGroup.objects.public_group().name
            )

    def test_create_workflow_engine_bad_group_name(self):
        galaxy_instance = GalaxyInstanceFactory()
        with self.assertRaises(CommandError):
            call_command(
                "create_workflowengine",
                str(galaxy_instance.id),
                "non-existent group name"
            )


class TestMigrations(TestCase):
    """
    Useful test class for testing Django Data migrations
    From https://www.caktusgroup.com/blog/2016/02/02/
    writing-unit-tests-django-migrations/
    """
    @property
    def app(self):
        return apps.get_containing_app_config(type(self).__module__).name

    migrate_from = None
    migrate_to = None

    def setUp(self):
        assert self.migrate_from and self.migrate_to, \
            "TestCase '{}' must define migrate_from and migrate_to properties"\
            .format(type(self).__name__)
        self.migrate_from = [(self.app, self.migrate_from)]
        self.migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(self.migrate_from).apps

        # Reverse to the original migration
        executor.migrate(self.migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(self.migrate_to)

        self.apps = executor.loader.project_state(self.migrate_to).apps

    def setUpBeforeMigration(self, apps):
        pass
