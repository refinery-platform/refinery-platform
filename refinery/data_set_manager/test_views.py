import json
import mock
import os
from urlparse import urljoin
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.http import QueryDict
from django.test import LiveServerTestCase, override_settings

from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_mock_hg_19_data_set,
                               create_mock_isatab_9909_data_set,
                               make_analyses_with_single_dataset)
from guardian.shortcuts import assign_perm
from mock import ANY
from rest_framework.test import (APIClient, APIRequestFactory, APITestCase,
                                 force_authenticate)

from core.models import DataSet, ExtendedGroup, InvestigationLink
from core.test_views import APIV2TestCase
from file_store.models import FileStoreItem
from file_store.tasks import FileImportTask

from .models import (AnnotatedNode, Assay, Attribute, AttributeOrder,
                     Investigation, Node, Study)
from .tests import MetadataImportTestBase
from .views import (AddFileToNodeView, Assays, AssaysAttributes, NodeViewSet,
                    StudiesView)

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"


class AddFileToNodeViewTests(APITestCase):
    def setUp(self):
        self.username = 'guest_user'
        self.password = User.objects.make_random_password()
        self.user = User.objects.create_user(self.username, 'user@fake.com',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.url_root = '/api/v2/data_set_manager/add-file/'
        self.view = AddFileToNodeView.as_view()
        self.client.login(username=self.username, password=self.password)

        # Create Datasets
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.node = self.data_set.get_nodes()[0]

        self.post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': self.node.uuid},
            format="json"
        )

    def test_post_returns_404_invalid_uuid(self):
        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': uuid.uuid4()},
            format="json"
        )
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 404)

    def test_post_returns_403_for_non_owners(self):
        user_lm = User.objects.create_user('lab_member',
                                           'member@fake.com',
                                           self.password)
        self.post_request.user = user_lm
        force_authenticate(self.post_request, user=user_lm)
        post_response = self.view(self.post_request)
        self.assertEqual(post_response.status_code, 403)

    def test_post_returns_success_202_with_no_files(self):
        self.post_request.user = self.user
        force_authenticate(self.post_request, user=self.user)
        post_response = self.view(self.post_request)
        self.assertEqual(post_response.status_code, 202)

    def test_post_returns_400_node_uuid_not_present(self):
        post_request = self.factory.post(
            self.url_root,
            data={},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws")
    def test_aws_post_returns_400_no_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': uuid.uuid4()},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws")
    def test_aws_post_returns_202_with_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': uuid.uuid4()
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 202)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="not aws")
    def test_non_aws_post_returns_400_if_identity_id(self):
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': uuid.uuid4()
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws",
                       UPLOAD_BUCKET="test_bucket",
                       REFINERY_DATA_IMPORT_DIR="/import/path",
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch("data_set_manager.models.Node.update_solr_index")
    def test_aws_post_file_store_item_source_translated(self,
                                                        update_solr_mock):
        file_store_item = self.node.get_file_store_item()
        file_store_item.source = "{}/{}/test.txt".format(
            settings.REFINERY_DATA_IMPORT_DIR,
            self.user.username
        )
        file_store_item.save()
        post_request = self.factory.post(
            self.url_root,
            data={
                'node_uuid': self.node.uuid,
                'identity_id': "test_identity_id"
            },
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.get_file_store_item().source,
                         's3://test_bucket/test_identity_id/test.txt')
        self.assertTrue(update_solr_mock.called)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="not aws",
                       REFINERY_DATA_IMPORT_DIR="/import/path",
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch("data_set_manager.models.Node.update_solr_index")
    def test_non_aws_post_file_store_item_source_translated(self,
                                                            update_solr_mock):
        file_store_item_source = "{}/{}/test.txt".format(
            settings.REFINERY_DATA_IMPORT_DIR,
            self.user.username
        )
        file_store_item = self.node.get_file_store_item()
        file_store_item.source = file_store_item_source
        file_store_item.save()

        post_request = self.factory.post(
            self.url_root,
            data={'node_uuid': self.node.uuid},
            format="json"
        )
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.get_file_store_item().source,
                         file_store_item_source)
        self.assertTrue(update_solr_mock.called)


class AssaysAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        self.assay = {
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
        assay = Assay.objects.create(**self.assay)
        self.assay['uuid'] = assay.uuid
        self.assay['study'] = self.study.id
        self.valid_uuid = assay.uuid
        self.url_root = '/api/v2/assays/'
        self.view = Assays.as_view()
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def test_get_valid_uuid(self):
        # valid_uuid
        request = self.factory.get('%s/?uuid=%s' % (
            self.url_root, self.valid_uuid))
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(response.data.keys(), self.assay.keys())
        self.assertItemsEqual(response.data.values(), self.assay.values())

    def test_get_valid_study(self):
        # valid_study_uuid
        request = self.factory.get('%s/?study=%s' % (
            self.url_root, self.study.uuid))
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(response.data[0].keys(), self.assay.keys())
        self.assertItemsEqual(response.data[0].values(), self.assay.values())

    def test_get_invalid_uuid(self):
        # invalid_uuid
        request = self.factory.get('%s/?uuid=%s' % (self.url_root,
                                                    self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_study_uuid(self):
        # invalid_study_uuid
        request = self.factory.get('%s/?study=%s' % (self.url_root,
                                                     self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_format_uuid(self):
        # invalid_format_uuid
        request = self.factory.get('%s/?uuid=%s'
                                   % (self.url_root, self.invalid_format_uuid))
        response = self.view(request, self.invalid_format_uuid)
        self.assertEqual(response.status_code, 404)


class AssaysAttributesAPITests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user("ownerJane", '', 'test1234')
        self.user2 = User.objects.create_user("guestName", '', 'test1234')
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        self.data_set = DataSet.objects.create(
                title="Test DataSet")
        InvestigationLink.objects.create(data_set=self.data_set,
                                         investigation=investigation)
        self.data_set.set_owner(self.user1)
        study = Study.objects.create(file_name='test_filename123.txt',
                                     title='Study Title Test',
                                     investigation=investigation)

        assay = Assay.objects.create(
                study=study,
                measurement='transcription factor binding site',
                measurement_accession='http://www.testurl.org/testID',
                measurement_source='OBI',
                technology='nucleotide sequencing',
                technology_accession='test info',
                technology_source='test source',
                platform='Genome Analyzer II',
                file_name='test_assay_filename.txt')

        self.attribute_order_array = [
            {
                'study': study,
                'assay': assay,
                'solr_field': 'Character_Title_6_3_s',
                'rank': 1,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Specimen_6_3_s',
                'rank': 2,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Cell_Type_6_3_s',
                'rank': 3,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Analysis_6_3_s',
                'rank': 4,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False
            }]

        self.attribute_order_response = [
            {
                'study': study,
                'assay': assay,
                'solr_field': 'Character_Title_6_3_s',
                'rank': 1,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False,
                'display_name': 'Character Title'
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Specimen_6_3_s',
                'rank': 2,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False,
                'display_name': 'Specimen'
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Cell_Type_6_3_s',
                'rank': 3,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False,
                'display_name': 'Cell Type'
            }, {
                'study': study,
                'assay': assay,
                'solr_field': 'Analysis_6_3_s',
                'rank': 4,
                'is_exposed': True,
                'is_facet': True,
                'is_active': True,
                'is_internal': False,
                'display_name': 'Analysis'
            }]

        index = 0
        for attribute in self.attribute_order_array:
            response = AttributeOrder.objects.create(**attribute)
            attribute['id'] = response.id
            attribute['assay'] = response.assay.id
            attribute['study'] = response.study.id
            self.attribute_order_response[index]['id'] = response.id
            self.attribute_order_response[index]['assay'] = response.assay.id
            self.attribute_order_response[index]['study'] = response.study.id
            index = index + 1

        list.sort(self.attribute_order_response)
        self.valid_uuid = assay.uuid
        self.url_root = '/api/v2/assays'
        self.view = AssaysAttributes.as_view()
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def test_get_valid_uuid(self):
        # valid_uuid
        uuid = self.valid_uuid
        request = self.factory.get('%s/%s/attributes/' % (self.url_root, uuid))
        response = self.view(request, uuid)
        self.assertEqual(response.status_code, 200)

        list.sort(response.data)

        ind = 0
        for attributes in response.data:
            self.assertItemsEqual(
                    self.attribute_order_response[ind].keys(),
                    attributes.keys())
            self.assertItemsEqual(
                    self.attribute_order_response[ind].values(),
                    attributes.values())
            ind = ind + 1

    def test_get_invalid_uuid(self):
        # invalid uuid
        request = self.factory.get('%s/%s/attributes/' % (
            self.url_root, self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content, '{"detail":"Not found."}')

    def test_get_invalid_form_uuid(self):
        # invalid form uuid
        request = self.factory.get('%s/%s/attributes/' % (
            self.url_root, self.invalid_format_uuid))
        response = self.view(request, self.invalid_format_uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content, '{"detail":"Not found."}')

    def test_put_valid_uuid(self):
        # valid_uuid
        self.client.login(username='ownerJane', password='test1234')
        updated_attribute_1 = {'solr_field': 'Character_Title_6_3_s',
                               'rank': 3,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        id = self.attribute_order_array[2].get('id')
        updated_attribute_2 = {'id': id,
                               'rank': 1,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        # Api client needs url to end / or it will redirect
        # update with solr_title
        response = self.client.put(
                '{0}/{1}/attributes/'.format(
                        self.url_root, self.valid_uuid), updated_attribute_1)
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data.get('rank'), updated_attribute_1.get(
                'rank'))
        self.assertEqual(
                response.data.get('is_exposed'),
                updated_attribute_1.get('is_exposed'))
        self.assertEqual(
                response.data.get('is_facet'),
                updated_attribute_1.get('is_facet'))

        # Update with attribute_order id
        response = self.client.put(
                '{0}/{1}/attributes/'.format(
                        self.url_root, self.valid_uuid), updated_attribute_2)
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data.get('rank'),
                         updated_attribute_2.get('rank'))
        self.assertEqual(
                response.data.get('is_exposed'),
                updated_attribute_2.get('is_exposed'))
        self.assertEqual(
                response.data.get('is_facet'),
                updated_attribute_2.get('is_facet'))
        self.client.logout()

    def test_put_invalid_object(self):
        # Invalid objects
        updated_attribute_3 = {'rank': '4',
                               'is_exposed': 'False',
                               'is_facet': 'False',
                               'is_active': 'False'}

        self.client.login(username='ownerJane', password='test1234')
        response = self.client.put('{0}/{1}/attributes/'
                                   .format(self.url_root, self.valid_uuid),
                                   updated_attribute_3)
        response.render()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
                response.content, '"Requires attribute id or solr_field name."'
                )
        self.client.logout()

    def test_put_invalid_login(self):
        # Invalid Login
        updated_attribute_4 = {'solr_field': 'Cell Type',
                               'rank': '4',
                               'is_exposed': 'False',
                               'is_facet': 'False',
                               'is_active': 'False'}

        self.client.login(username='guestName', password='test1234')
        response = self.client.put('{0}/{1}/attributes/'
                                   .format(self.url_root, self.valid_uuid),
                                   updated_attribute_4)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
                response.content, '"Only owner may edit attribute order."'
                )
        self.client.logout()


class AssaysFilesAPITests(APITestCase):

    def setUp(self):
        self.user_owner = 'owner'
        self.user_guest = 'guest'
        self.fake_password = 'test1234'
        self.data_set = create_dataset_with_necessary_models()
        self.user1 = User.objects.create_user(self.user_owner,
                                              '',
                                              self.fake_password)
        self.user2 = User.objects.create_user(self.user_guest,
                                              '',
                                              self.fake_password)
        self.data_set.set_owner(self.user1)
        investigation = Investigation.objects.create()
        self.investigation_link = \
            InvestigationLink.objects.create(investigation=investigation,
                                             data_set=self.data_set,
                                             version=1)

        study = Study.objects.create(file_name='test_filename123.txt',
                                     title='Study Title Test',
                                     investigation=investigation)

        assay = Assay.objects.create(
                study=study,
                measurement='transcription factor binding site',
                measurement_accession='http://www.testurl.org/testID',
                measurement_source='OBI',
                technology='nucleotide sequencing',
                technology_accession='test info',
                technology_source='test source',
                platform='Genome Analyzer II',
                file_name='test_assay_filename.txt',
                )
        self.valid_uuid = assay.uuid
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.url = "/api/v2/assays/%s/files/"
        self.non_meta_attributes = ['REFINERY_DOWNLOAD_URL', 'REFINERY_NAME']
        self.client = APIClient()

    def tearDown(self):
        self.client.logout()
        super(AssaysFilesAPITests, self).tearDown()

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_owner_with_valid_params(self,
                                              mock_format,
                                              mock_search,
                                              mock_generate):
        self.client.login(username=self.user_owner,
                          password=self.fake_password)
        mock_format.return_value = {'status': 200}
        uuid = self.valid_uuid
        params = {
            'limit': '0',
            'data_set_uuid': self.data_set.uuid
        }
        response = self.client.get(self.url % uuid, params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict, uuid)
        self.assertEqual(response.status_code, 200)

    def test_get_from_owner_invalid_params(self):
        self.client.login(username=self.user_owner,
                          password=self.fake_password)

        uuid = self.valid_uuid
        params = {'limit': 0,
                  'data_set_uuid': self.invalid_uuid}
        response = self.client.get(self.url % uuid, params)
        self.assertEqual(response.status_code, 404)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_no_perms(self,
                                    mock_format,
                                    mock_search,
                                    mock_generate):
        self.client.login(username=self.user_guest,
                          password=self.fake_password)

        uuid = self.valid_uuid
        params = {
            'limit': 0,
            'data_set_uuid': self.data_set.uuid
        }
        response = self.client.get(self.url % uuid, params)
        self.assertFalse(mock_format.called)
        self.assertFalse(mock_search.called)
        self.assertFalse(mock_generate.called)
        self.assertEqual(response.status_code, 401)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_with_read_perms(self,
                                           mock_format,
                                           mock_search,
                                           mock_generate):
        mock_format.return_value = {'status': 200}
        self.client.login(username=self.user_guest,
                          password=self.fake_password)
        assign_perm('read_%s' % DataSet._meta.model_name,
                    self.user2,
                    self.data_set)
        uuid = self.valid_uuid
        params = {'limit': '0',
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url % uuid, params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict, uuid)
        self.assertEqual(response.status_code, 200)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_with_read_meta_perms(self,
                                                mock_format,
                                                mock_search,
                                                mock_generate):
        mock_format.return_value = {'status': 200}
        self.client.login(username=self.user_guest,
                          password=self.fake_password)
        assign_perm('read_meta_%s' % DataSet._meta.model_name,
                    self.user2,
                    self.data_set)

        uuid = self.valid_uuid
        params = {'limit': '0',
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url % uuid, params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict,
                                              uuid,
                                              self.non_meta_attributes)
        self.assertEqual(response.status_code, 200)


class CheckDataFilesViewTests(MetadataImportTestBase):
    def setUp(self):
        super(CheckDataFilesViewTests, self).setUp()
        self.check_files_url = "/data_set_manager/import/check_files/"

    def test_check_datafiles_non_ajax_request(self):
        response = self.client.post(
            self.check_files_url,
            content_type="application/json",
            data=json.dumps({"hello": "world"})
        )
        self.assertEqual(response.status_code, 400)

    def test_check_datafiles_empty_body(self):
        response = self.client.post(
            self.check_files_url,
            content_type="application/json",
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 400)

    def test_check_datafiles_wrong_content_type(self):
        response = self.client.post(
            self.check_files_url,
            data={"list": ["a", "b", "c"]},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 400)

    def test_check_datafiles_no_files_uploaded(self):
        response = self.client.post(
            self.check_files_url,
            content_type="application/json",
            data=json.dumps({"list": ["a.txt", "b.txt"]}),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(
            json.loads(response.content),
            {
                "data_files_to_be_deleted": [],
                "data_files_not_uploaded": ["a.txt", "b.txt"]
            }
        )

    def test_check_datafiles_subset_of_files_uploaded(self):
        open(os.path.join(self.test_user_directory, "a.txt"), "a").close()
        response = self.client.post(
            self.check_files_url,
            content_type="application/json",
            data=json.dumps({"list": ["a.txt", "b.txt"]}),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(
            json.loads(response.content),
            {
                "data_files_to_be_deleted": [],
                "data_files_not_uploaded": ["b.txt"]
            }
        )

    def test_check_datafiles_all_files_uploaded(self):
        for name in ["a.txt", "b.txt"]:
            open(os.path.join(self.test_user_directory, name), "a").close()
        response = self.client.post(
            self.check_files_url,
            content_type="application/json",
            data=json.dumps({"list": ["a.txt", "b.txt"]}),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(
            json.loads(response.content),
            {
                "data_files_to_be_deleted": [],
                "data_files_not_uploaded": []
            }
        )

    def test_check_datafiles_non_existing_data_set_uuid(self):
        response = self.client.post(
            "{}?data_set_uuid={}".format(self.check_files_url, uuid.uuid4()),
            content_type="application/json",
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(response.status_code, 404)

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_check_datafiles_metadata_revision_subset_uploaded(self):
        open(os.path.join(self.test_user_directory, "test1.txt"), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                "single-file/two-line-local.csv"
            )
        )

        data_set = DataSet.objects.last()
        response = self.client.post(
            "{}?data_set_uuid={}".format(self.check_files_url, data_set.uuid),
            content_type="application/json",
            data=json.dumps({"list": ["test1.txt", "test2.txt"]}),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(
            json.loads(response.content),
            {
                "data_files_to_be_deleted": [],
                "data_files_not_uploaded": ["test2.txt"]
            }
        )

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_check_datafiles_metadata_revision_files_will_be_deleted(self):
        open(os.path.join(self.test_user_directory, "test1.txt"), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                "single-file/two-line-local.csv"
            )
        )

        data_set = DataSet.objects.last()
        response = self.client.post(
            "{}?data_set_uuid={}".format(self.check_files_url, data_set.uuid),
            content_type="application/json",
            data=json.dumps({"list": ["fake.txt"]}),
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(
            json.loads(response.content),
            {
                "data_files_to_be_deleted": ["test1.txt"],
                "data_files_not_uploaded": ["fake.txt"]
            }
        )


class NodeViewAPIV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(NodeViewAPIV2Tests, self).setUp(
            api_base_name="nodes/",
            view=NodeViewSet.as_view()
        )
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.hg_19_data_set = create_mock_hg_19_data_set(user=self.user)
        self.isatab_9909_data_set = create_mock_isatab_9909_data_set(
            user=self.user
        )
        self.node = self.data_set.get_nodes()[0]

    def test_get_uuid_returns_400(self):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        get_request = self.factory.get(urljoin(self.url_root, self.node.uuid))
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request, node.uuid)
        self.assertEqual(get_response.status_code, 400)

    def test_get_returns_401_non_owners(self):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        get_request = self.factory.get(urljoin(self.url_root, self.node.uuid),
                                       {'related_attribute_nodes': solr_name})
        guest_user = User.objects.create_user('guest_user',
                                              'not_owner@fake.com',
                                              self.password)
        force_authenticate(get_request, user=guest_user)
        get_response = self.view(get_request, node.uuid)
        self.assertEqual(get_response.status_code, 401)

    def test_get_returns_empty_list_for_dataset_without_related_nodes(self):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        get_request = self.factory.get(urljoin(self.url_root, node.uuid),
                                       {'related_attribute_nodes': solr_name})

        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request, node.uuid)
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data, [])

    def test_get_returns_derived_nodes_for_dataset_with_related_nodes(self):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=file_node,
            attribute_subtype='organism part'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        get_request = self.factory.get(urljoin(self.url_root, file_node.uuid),
                                       {'related_attribute_nodes': solr_name})

        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request, file_node.uuid)
        self.assertEqual(get_response.status_code, 200)
        assay_nodes = Node.objects.filter(assay=file_node.assay).exclude(
            id=file_node.id
        )
        derived_nodes_uuid = [node.uuid for node in assay_nodes if
                              node.is_derived()]
        self.assertItemsEqual(get_response.data, derived_nodes_uuid)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_remove_data_file_200_status(self, mock_index):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"file_uuid": ''}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.node.uuid)
        self.assertTrue(mock_index.called)
        self.assertEqual(patch_response.status_code, 200)

    @mock.patch('core.models.DataSet.is_clean')
    def test_patch_not_clean_400_status(self, mock_clean):
        mock_clean.return_value = False
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"file_uuid": ''}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 400)

    def test_patch_missing_file_store_item_400_status(self):
        file_store_item = FileStoreItem.objects.get(uuid=self.node.file_uuid)
        file_store_item.delete()

        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"file_uuid": ''}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 400)

    def test_patch_non_owner_401_status(self):
        self.non_owner = User.objects.create_user('Random User',
                                                  'rand_user@fake.com',
                                                  self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"file_uuid": ''}
        )
        force_authenticate(patch_request, user=self.non_owner)
        patch_response = self.view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_patch_edit_field_405_status(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"name": 'New Node Name'}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 405)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_updates_nodes_attributes(self, update_solr_index_mock):
        # updates the source attributes
        new_value = 'mouse'
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(urljoin(self.url_root, node.uuid),
                                           {"attribute_solr_name": solr_name,
                                            "attribute_value": new_value})
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, node.uuid)
        self.assertEqual(annotated_node.attribute.value, new_value)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_updates_attribute_value(self, update_solr_index_mock):
        # updates the hardcoded annotated node's attribute_value
        new_value = 'zebra'
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, node.uuid)
        annotated_node.refresh_from_db()
        self.assertEqual(annotated_node.attribute_value, new_value)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_calls_update_solr_index(self, update_solr_index_mock):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": 'mouse'}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, node.uuid)
        self.assertTrue(update_solr_index_mock.called)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_return_405_for_derived(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        derived_node = nodes.filter(type=Node.DERIVED_ARRAY_DATA_FILE)[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=derived_node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, derived_node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": 'mouse'}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, derived_node.uuid)
        self.assertEqual(patch_response.status_code, 405)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_return_400_non_edit_attributes(self,
                                                  update_solr_index_mock):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        solr_name = '{}_{}_652_326_s'.format('REFINERY_NAME',
                                             'Internal')
        patch_request = self.factory.patch(
            urljoin(self.url_root, node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": 'New Name'}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.view(patch_request, node.uuid)
        self.assertEqual(patch_response.status_code, 400)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_annotated_node(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=file_node,
            attribute_subtype='organism part'
        )[0]
        new_value = 'cell'
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, file_node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, file_node.uuid)
        annotated_node.refresh_from_db()
        self.assertEqual(annotated_node.attribute_value, new_value)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_source_attribute(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=file_node,
            attribute_subtype='organism part'
        )[0]
        new_value = 'cell'
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, file_node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, file_node.uuid)
        annotated_node.refresh_from_db()
        # source node attribute updated
        source_node = nodes.filter(
            type=Node.SOURCE,
            name='myoblasts'
        )[0]
        source_attribute = Attribute.objects.filter(
            node=source_node,
            subtype='organism part'
        )[0]
        self.assertEqual(source_attribute.value, new_value)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_updates_child_nodes(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=file_node,
            attribute_subtype='organism part'
        )[0]
        new_value = 'cell'
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, file_node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, file_node.uuid)
        annotated_node.refresh_from_db()
        # derived nodes attribute_values updated, there's six
        derived_array_nodes = nodes.filter(type=Node.DERIVED_ARRAY_DATA_FILE)
        derived_attributes = []
        for node in derived_array_nodes:
            ann_node_new = AnnotatedNode.objects.filter(
                node=node,
                attribute_subtype='organism part',
                attribute_value=new_value
            )
            derived_attributes.extend(ann_node_new)
        self.assertEqual(len(derived_attributes), 2)

        derived_array_matrix_nodes = nodes.filter(
            type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE
        )
        derived_matrix_attributes = []
        for node in derived_array_matrix_nodes:
            ann_node_new = AnnotatedNode.objects.filter(
                node=node,
                attribute_subtype='organism part',
                attribute_value=new_value
            )
            derived_matrix_attributes.extend(ann_node_new)
        self.assertEqual(len(derived_matrix_attributes), 4)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_not_edit_non_child_nodes(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=file_node, attribute_subtype='organism part'
        )[0]
        old_value = annotated_node.attribute_value
        new_value = 'cell'
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, file_node.uuid),
            {"attribute_solr_name": solr_name,
             "attribute_value": new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.view(patch_request, file_node.uuid)
        annotated_node.refresh_from_db()
        # derived nodes attribute_values not updated, there's 6
        derived_array_nodes = nodes.filter(type=Node.DERIVED_ARRAY_DATA_FILE)
        derived_attributes = []
        for node in derived_array_nodes:
            ann_node_old = AnnotatedNode.objects.filter(
                node=node,
                attribute_subtype='organism part',
                attribute_value=old_value
            )
            derived_attributes.extend(ann_node_old)
        self.assertEqual(len(derived_attributes), 2)

        derived_array_matrix_nodes = nodes.filter(
            type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE
        )
        derived_matrix_attributes = []
        for node in derived_array_matrix_nodes:
            ann_node_old = AnnotatedNode.objects.filter(
                node=node,
                attribute_subtype='organism part',
                attribute_value=old_value
            )
            derived_matrix_attributes.extend(ann_node_old)
        self.assertEqual(len(derived_matrix_attributes), 4)


class ProcessISATabViewTests(MetadataImportTestBase):
    @mock.patch.object(FileImportTask, 'delay')
    def test_post_good_isa_tab_file(self, delay_mock):
        with open(self.get_test_file_path('rfc-test.zip')) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)
        self.successful_import_assertions()

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_post_good_isa_tab_file_with_datafiles(self):
        for name in ["rfc94.txt", "rfc134.txt"]:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)

        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 3
        )

    @mock.patch.object(FileImportTask, 'delay')
    def test_node_index_update_object_called_with_proper_args(self,
                                                              delay_mock):
        with open(self.get_test_file_path('rfc-test.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        self.update_node_index_mock.assert_called_with(
            ANY, using="data_set_manager"
        )

    def test_post_bad_isa_tab_file(self):
        with open(self.get_test_file_path('HideLabBrokenA.zip')) as bad_isa:
            self.post_isa_tab(isa_tab_file=bad_isa)
        self.unsuccessful_import_assertions()

    def test_post_bad_isa_tab_url(self):
        self.post_isa_tab(isa_tab_url="non-existant-file")
        self.unsuccessful_import_assertions()

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_metadata_revision_works_grammatical_changes_only(self):
        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        self.assertFalse(
            AnnotatedNode.objects.filter(attribute_value="EDITED")
        )

        with open(self.get_test_file_path('rfc-test-local-edited.zip')) as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)
        self.assertTrue(
            AnnotatedNode.objects.filter(attribute_value="EDITED")
        )

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_metadata_revision_works_existing_datafiles_persisted(self):
        local_data_file_names = ["rfc94.txt", "rfc134.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        with open(self.get_test_file_path('rfc-test-local-edited.zip')) as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)
        data_set_count = DataSet.objects.count()
        revised_data_set = DataSet.objects.last()

        # Assert no new DataSet created
        self.assertEqual(data_set_count, 1)

        # Assert that DataSet version incremented
        self.assertEqual(revised_data_set.get_version(), 2)

        # Assert that previously uploaded data file remain accessible
        investigation = revised_data_set.get_investigation()
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 3
        )

        for file_store_item in investigation.get_file_store_items(
            exclude_metadata_file=True, local_only=True
        ):
            self.assertIn(os.path.basename(file_store_item.source),
                          local_data_file_names)
        # Assert that the prior Investigation is no longer pointing to local
        #  datafiles
        self.assertFalse(
            data_set.get_investigation(version=1).get_file_store_items(
                exclude_metadata_file=True, local_only=True
            )
        )

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_metadata_revision_works_datafiles_added_during_revision(self):
        local_data_file_names = ["rfc94.txt", "rfc134.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        local_data_file_names_for_revision = ["rfc111.txt"]
        for name in local_data_file_names_for_revision:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local-edited.zip')) as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)
        data_set_count = DataSet.objects.count()
        revised_data_set = DataSet.objects.last()

        # Assert no new DataSet created
        self.assertEqual(data_set_count, 1)

        # Assert that DataSet version incremented
        self.assertEqual(revised_data_set.get_version(), 2)

        # Assert that previously uploaded data file remain accessible
        investigation = revised_data_set.get_investigation()
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 4
        )

        for file_store_item in investigation.get_file_store_items(
                exclude_metadata_file=True, local_only=True
        ):
            self.assertIn(
                os.path.basename(file_store_item.source),
                local_data_file_names + local_data_file_names_for_revision
            )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    @mock.patch.object(FileStoreItem, "terminate_file_import_task")
    def test_metadata_revision_works_datafiles_removed_during_revision(
        self, terminate_file_import_task_mock
    ):
        local_data_file_names = ["rfc94.txt", "rfc134.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        with open(self.get_test_file_path('rfc-test.zip')) as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)

        revised_data_set = DataSet.objects.last()

        # Assert that previously uploaded data files are removed
        first_investigation = revised_data_set.get_investigation(version=1)
        self.assertEqual(
            len(first_investigation.get_file_store_items(
                exclude_metadata_file=True, local_only=True
            )), 0
        )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_metadata_revision_updates_dataset_title(self):
        with open(self.get_test_file_path('rfc-test-local.zip')) as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()
        with open(self.get_test_file_path('rfc-test-local-edited.zip')) as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)

        revised_data_set = DataSet.objects.last()
        self.assertEqual(revised_data_set.title,
                         'Request for Comments (RFC) Test Edited')

    def test_metadata_revision_fails_with_unclean_dataset(self):
        analyses, data_set = make_analyses_with_single_dataset(1, self.user)
        with open(self.get_test_file_path('rfc-test.zip')) as isa_tab_file:
            response = self.post_isa_tab(
                isa_tab_file=isa_tab_file, data_set_uuid=data_set.uuid
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content,
                "ISA-Tab import Failure:  DataSet with UUID: {} is not clean "
                "(There have been Analyses or Visualizations performed on it) "
                "Remove these objects and try again"
                .format(data_set.uuid)
            )

    def test_metadata_revision_is_only_allowed_if_data_set_owner(self):
        data_set = create_dataset_with_necessary_models()
        metadata_file_name = 'rfc-test-local.zip'
        with open(self.get_test_file_path(metadata_file_name)) as isa_tab:
            response = self.post_isa_tab(isa_tab_file=isa_tab,
                                         data_set_uuid=data_set.uuid)
            self.assertEqual(response.status_code, 403)
            self.assertIn(
                "Metadata revision is only allowed for Data Set owners",
                response.content
            )


class ProcessISATabViewLiveServerTests(MetadataImportTestBase,
                                       LiveServerTestCase):
    @mock.patch.object(FileImportTask, 'delay')
    def test_post_good_isa_tab_url(self, delay_mock):
        media_root_path = os.path.join(
            settings.BASE_DIR, 'refinery', TEST_DATA_BASE_PATH
        )
        with self.settings(MEDIA_ROOT=media_root_path):
            media_url = urljoin(self.live_server_url, settings.MEDIA_URL)
            good_isa_tab_url = urljoin(media_url, "rfc-test.zip")
            self.post_isa_tab(isa_tab_url=good_isa_tab_url)
        self.successful_import_assertions()


class ProcessMetadataTableViewTests(MetadataImportTestBase):
    @mock.patch.object(FileImportTask, 'delay')
    def test_post_good_tabular_file(self, delay_mock):
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        self.successful_import_assertions()

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_post_good_tabular_file_with_datafiles(self):
        for name in ["test1.txt", "test2.txt"]:
            open(os.path.join(self.test_user_directory, name), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 3
        )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    @mock.patch.object(FileStoreItem, 'terminate_file_import_task')
    def test_metadata_revision_works_grammatical_changes_only(
        self, terminate_file_import_task_mock
    ):
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        data_set = DataSet.objects.last()
        self.assertFalse(
            AnnotatedNode.objects.filter(attribute_value="EDITED")
        )
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/three-line-local.csv'
            ),
            data_set_uuid=data_set.uuid
        )
        # Assert no new DataSet created
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertTrue(AnnotatedNode.objects.filter(attribute_value='EDITED'))

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    @mock.patch.object(FileStoreItem, "terminate_file_import_task")
    def test_metadata_revision_works_existing_datafiles_persisted(
        self, terminate_file_import_task_mock
    ):
        local_data_file_names = ["test1.txt", "test2.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        data_set = DataSet.objects.last()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/three-line-local.csv'
            ),
            data_set_uuid=data_set.uuid
        )
        data_set_count = DataSet.objects.count()
        revised_data_set = DataSet.objects.last()

        # Assert no new DataSet created
        self.assertEqual(data_set_count, 1)

        # Assert that DataSet version incremented
        self.assertEqual(revised_data_set.get_version(), 2)

        # Assert that previously uploaded data file remain accessible
        investigation = revised_data_set.get_investigation()
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 3
        )

        for file_store_item in investigation.get_file_store_items(
                exclude_metadata_file=True, local_only=True
        ):
            self.assertIn(os.path.basename(file_store_item.source),
                          local_data_file_names)
        # Assert that the prior Investigation is no longer pointing to local
        #  datafiles
        self.assertFalse(
            data_set.get_investigation(version=1).get_file_store_items(
                exclude_metadata_file=True, local_only=True
            )
        )

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    @mock.patch.object(FileStoreItem, "terminate_file_import_task")
    def test_metadata_revision_works_datafiles_added_during_revision(
        self, terminate_file_import_task_mock
    ):
        local_data_file_names = ["test1.txt", "test2.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()

        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        data_set = DataSet.objects.last()

        local_data_file_names_for_revision = ["test3.txt"]
        for name in local_data_file_names_for_revision:
            open(os.path.join(self.test_user_directory, name), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/three-line-local.csv'
            ),
            data_set_uuid=data_set.uuid
        )
        data_set_count = DataSet.objects.count()
        revised_data_set = DataSet.objects.last()

        # Assert no new DataSet created
        self.assertEqual(data_set_count, 1)

        # Assert that DataSet version incremented
        self.assertEqual(revised_data_set.get_version(), 2)

        # Assert that all datafiles have been uploaded and associated
        investigation = revised_data_set.get_investigation()
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 4
        )

        for file_store_item in investigation.get_file_store_items(
                exclude_metadata_file=True, local_only=True
        ):
            self.assertIn(
                os.path.basename(file_store_item.source),
                local_data_file_names + local_data_file_names_for_revision
            )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    @mock.patch.object(FileStoreItem, "terminate_file_import_task")
    def test_metadata_revision_works_datafiles_removed_during_revision(
        self, terminate_file_import_task_mock
    ):
        local_data_file_names = ["test1.txt", "test2.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            )
        )
        data_set = DataSet.objects.last()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/one-line.csv'
            ),
            data_set_uuid=data_set.uuid
        )
        revised_data_set = DataSet.objects.last()

        # Assert that previously uploaded data files are removed
        first_investigation = revised_data_set.get_investigation(version=1)
        self.assertEqual(
            len(first_investigation.get_file_store_items(
                exclude_metadata_file=True, local_only=True)), 0
        )

    @override_settings(CELERY_ALWAYS_EAGER=True)
    @mock.patch.object(FileStoreItem, "terminate_file_import_task")
    def test_metadata_revision_updates_dataset_title(
        self, terminate_file_import_task_mock
    ):
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-local.csv'
            ),
        )
        data_set = DataSet.objects.last()
        self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/three-line-local.csv'
            ),
            data_set_uuid=data_set.uuid,
            title="New Title"
        )

        revised_data_set = DataSet.objects.last()
        self.assertEqual(revised_data_set.title, "New Title")

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_metadata_revision_fails_with_unclean_dataset(self):
        analyses, data_set = make_analyses_with_single_dataset(1, self.user)
        response = self.post_tabular_meta_data_file(
                meta_data_file_path=self.get_test_file_path(
                    'single-file/three-line-local.csv'
                ),
                data_set_uuid=data_set.uuid
            )
        self.assertEqual(
            json.loads(response.content),
            {
                "error": (
                    "DataSet with UUID: {} is not clean (There have been "
                    "Analyses or Visualizations performed on it) Remove "
                    "these objects and try again".format(data_set.uuid)
                )
            }
        )

    def test_metadata_revision_is_only_allowed_if_data_set_owner(self):
        data_set = create_dataset_with_necessary_models()
        response = self.post_tabular_meta_data_file(
            meta_data_file_path=self.get_test_file_path(
                'single-file/two-line-s3.csv'
            ),
            data_set_uuid=data_set.uuid
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn(
            "Metadata revision is only allowed for Data Set owners",
            response.content
        )


class StudiesViewAPIV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(StudiesViewAPIV2Tests, self).setUp(
            api_base_name="studies/",
            view=StudiesView.as_view()
        )
        self.data_set = create_dataset_with_necessary_models(user=self.user)

    def test_get_missing_data_set_uuid_returns_400(self):
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 400)

    def test_get_returns_401_for_unauthorized_users(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 401)

    def test_get_returns_public_studies_for_anon(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('uuid'),
                         self.data_set.get_studies()[0].uuid)

    def test_get_returns_studies_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('uuid'),
                         self.data_set.get_studies()[0].uuid)

    def test_get_returns_title_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('title'),
                         self.data_set.get_studies()[0].title)

    def test_get_returns_description_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('description'),
                         self.data_set.get_studies()[0].description)

    def test_get_returns_submission_date_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('submission_date'),
                         self.data_set.get_studies()[0].submission_date)

    def test_get_returns_identifier_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('identifier'),
                         self.data_set.get_studies()[0].identifier)

    def test_get_returns_release_date_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('release_date'),
                         self.data_set.get_studies()[0].release_date)

    def test_get_returns_file_name_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('file_name'),
                         self.data_set.get_studies()[0].file_name)

    def test_get_returns_investigation_id_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'dataSetUuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('investigation'),
                         self.data_set.get_studies()[0].investigation.id)
