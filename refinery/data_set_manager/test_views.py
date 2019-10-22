import json
import mock
import os
from urllib.parse import urljoin
import uuid

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.sites.models import Site
from django.forms.models import model_to_dict
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
from .views import (AddFileToNodeView, AssayAPIView, AssayAttributeAPIView,
                    NodeViewSet, StudyAPIView,
                    TakeOwnershipOfPublicDatasetView)

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"


class AddFileToNodeViewTests(APITestCase):
    def setUp(self):
        self.username = 'guest_user'
        self.password = User.objects.make_random_password()
        self.user = User.objects.create_user(self.username, 'user@example.com',
                                             self.password)
        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.url_root = '/api/v2/data_set_manager/add-file/'
        self.view = AddFileToNodeView.as_view()
        self.client.login(username=self.username, password=self.password)
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.node = self.data_set.get_nodes()[0]
        self.post_request = self.factory.post(
            self.url_root, data={'node_uuid': self.node.uuid}, format='json'
        )

    def test_post_returns_404_invalid_uuid(self):
        post_request = self.factory.post(
            self.url_root, data={'node_uuid': uuid.uuid4()}, format='json'
        )
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 404)

    def test_post_returns_403_for_non_owners(self):
        user_lm = User.objects.create_user('lab_member', 'member@example.com',
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
        post_request = self.factory.post(self.url_root, data={}, format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM='aws')
    def test_aws_post_returns_400_no_identity_id(self):
        post_request = self.factory.post(self.url_root,
                                         data={'node_uuid': uuid.uuid4()},
                                         format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM="aws")
    def test_aws_post_returns_202_with_identity_id(self):
        post_request = self.factory.post(self.url_root,
                                         data={
                                             'node_uuid': self.node.uuid,
                                             'identity_id': uuid.uuid4()
                                         },
                                         format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 202)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM='not aws')
    def test_non_aws_post_returns_400_if_identity_id(self):
        post_request = self.factory.post(self.url_root,
                                         data={
                                             'node_uuid': self.node.uuid,
                                             'identity_id': uuid.uuid4()
                                         },
                                         format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM='aws',
                       UPLOAD_BUCKET='test_bucket',
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_aws_post_file_store_item_source_translated(self,
                                                        update_solr_mock):
        self.node.file_item.source = \
            's3://test_bucket/test_identity_id/test.txt'
        self.node.file_item.save()
        post_request = self.factory.post(self.url_root,
                                         data={
                                             'node_uuid': self.node.uuid,
                                             'identity_id': 'test_identity_id'
                                         },
                                         format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.file_item.source,
                         's3://test_bucket/test_identity_id/test.txt')
        self.assertTrue(update_solr_mock.called)

    @override_settings(REFINERY_DEPLOYMENT_PLATFORM='not aws',
                       REFINERY_DATA_IMPORT_DIR='/import/path',
                       CELERY_ALWAYS_EAGER=True)
    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_non_aws_post_file_store_item_source_translated(self,
                                                            update_solr_mock):
        file_store_item_source = '{}/{}/test.txt'.format(
            settings.REFINERY_DATA_IMPORT_DIR, self.user.username
        )
        self.node.file_item.source = file_store_item_source
        self.node.file_item.save()

        post_request = self.factory.post(self.url_root,
                                         data={'node_uuid': self.node.uuid},
                                         format='json')
        post_request.user = self.user
        force_authenticate(post_request, user=self.user)
        self.view(post_request)
        self.assertEqual(self.node.file_item.source, file_store_item_source)
        self.assertTrue(update_solr_mock.called)


class AssayAPIViewTests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        self.study = Study.objects.create(file_name='test_filename123.txt',
                                          title='Study Title Test',
                                          investigation=investigation)
        self.assay = Assay.objects.create(
            study=self.study, measurement='transcription factor binding site',
            measurement_accession='http://www.example.org/test_id',
            measurement_source='OBI', technology='nucleotide sequencing',
            technology_accession='test info', technology_source='test source',
            platform='Genome Analyzer II', file_name='test_assay_filename.txt'
        )
        # dictionary for checking response contents
        self.assay_dict = model_to_dict(self.assay)
        # model_to_dict() does not return fields that are not editable
        self.assay_dict['uuid'] = str(self.assay.uuid)

        self.valid_uuid = str(self.assay.uuid)
        self.url_root = '/api/v2/assays/'
        self.view = AssayAPIView.as_view()
        self.unknown_uuid = str(uuid.uuid4())
        self.invalid_uuid = "xxxxxxxx"

    def test_get_valid_uuid(self):
        request = self.factory.get(self.url_root + '?uuid=' + self.valid_uuid)
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertDictContainsSubset(response.data, self.assay_dict)

    def test_get_valid_study(self):
        request = self.factory.get(self.url_root + '?study=' + self.study.uuid)
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertDictContainsSubset(response.data[0], self.assay_dict)

    def test_get_unknown_uuid(self):
        request = self.factory.get(
            self.url_root + '?uuid=' + self.unknown_uuid
        )
        response = self.view(request, self.unknown_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_unknown_study_uuid(self):
        request = self.factory.get(
            self.url_root + '?study=' + self.unknown_uuid
        )
        response = self.view(request, self.unknown_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_uuid(self):
        request = self.factory.get(
            self.url_root + '?uuid=' + self.invalid_uuid
        )
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 400)


class AssayAttributeAPITests(APITestCase):

    def setUp(self):
        self.user1_username = 'ownerJane'
        self.user1_password = 'test1234'
        self.user2_username = 'guestName'
        self.user2_password = 'test1234'
        self.user1 = User.objects.create_user(
            self.user1_username, '', self.user1_password
        )
        self.user2 = User.objects.create_user(
            self.user2_username, '', self.user2_password
        )
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        self.data_set = DataSet.objects.create(title="Test DataSet")
        InvestigationLink.objects.create(data_set=self.data_set,
                                         investigation=investigation)
        self.data_set.set_owner(self.user1)
        study = Study.objects.create(file_name='test_filename123.txt',
                                     title='Study Title Test',
                                     investigation=investigation)
        assay = Assay.objects.create(
                study=study,
                measurement='transcription factor binding site',
                measurement_accession='http://www.example.org/testID',
                measurement_source='OBI',
                technology='nucleotide sequencing',
                technology_accession='test info',
                technology_source='test source',
                platform='Genome Analyzer II',
                file_name='test_assay_filename.txt'
        )
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
            }
        ]
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
            }
        ]
        for index in range(len(self.attribute_order_array)):
            response = AttributeOrder.objects.create(
                **self.attribute_order_array[index]
            )
            self.attribute_order_array[index]['id'] = response.id
            self.attribute_order_array[index]['assay'] = response.assay.id
            self.attribute_order_array[index]['study'] = response.study.id
            self.attribute_order_response[index]['id'] = response.id
            self.attribute_order_response[index]['assay'] = response.assay.id
            self.attribute_order_response[index]['study'] = response.study.id

        self.valid_uuid = str(assay.uuid)
        self.url_root = '/api/v2/assays/'
        self.view = AssayAttributeAPIView.as_view()
        self.unknown_uuid = str(uuid.uuid4())
        self.invalid_uuid = 'xxxxxxxx'

    def test_get_valid_uuid(self):
        request = self.factory.get(
            self.url_root + self.valid_uuid + '/attributes/'
        )
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(self.attribute_order_response, response.data)

    def test_get_unknown_uuid(self):
        request = self.factory.get(
            self.url_root + self.unknown_uuid + '/attributes/'
        )
        response = self.view(request, self.unknown_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_uuid(self):
        request = self.factory.get(
            self.url_root + self.invalid_uuid + '/attributes/'
        )
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 400)

    def test_put_valid_uuid(self):
        updated_attribute_1 = {'solr_field': 'Character_Title_6_3_s',
                               'rank': 3,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        updated_attribute_2 = {'id': self.attribute_order_array[2].get('id'),
                               'rank': 1,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        self.client.login(username=self.user1_username,
                          password=self.user1_password)
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_1
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data.get('rank'),
                         updated_attribute_1.get('rank'))
        self.assertEqual(response.data.get('is_exposed'),
                         updated_attribute_1.get('is_exposed'))
        self.assertEqual(response.data.get('is_facet'),
                         updated_attribute_1.get('is_facet'))
        # Update with attribute_order id
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_2
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data.get('rank'),
                         updated_attribute_2.get('rank'))
        self.assertEqual(response.data.get('is_exposed'),
                         updated_attribute_2.get('is_exposed'))
        self.assertEqual(response.data.get('is_facet'),
                         updated_attribute_2.get('is_facet'))
        self.client.logout()

    def test_put_invalid_object(self):
        updated_attribute_3 = {'rank': '4',
                               'is_exposed': 'False',
                               'is_facet': 'False',
                               'is_active': 'False'}
        self.client.login(username=self.user1_username,
                          password=self.user1_password)
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_3
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.content,
                         b'"Requires attribute id or solr_field name."')
        self.client.logout()

    def test_put_invalid_login(self):
        updated_attribute_4 = {'solr_field': 'Cell Type',
                               'rank': '4',
                               'is_exposed': 'False',
                               'is_facet': 'False',
                               'is_active': 'False'}

        self.client.login(username=self.user1.username,
                          password=self.user1.password)
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_4
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.content,
                         b'"Only owner may edit attribute order."')
        self.client.logout()

    def test_put_object_id_without_attribute_order(self):
        updated_attribute_2 = {'id': self.attribute_order_array[2].get('id'),
                               'rank': 1,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        self.client.login(username=self.user1_username,
                          password=self.user1_password)
        AttributeOrder.objects.all().delete()
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_2
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content,
                         b'"Could not find attribute orders to update"')
        self.client.logout()

    def test_put_object_solr_without_attribute_order(self):
        updated_attribute_1 = {'solr_field': 'Character_Title_6_3_s',
                               'rank': 3,
                               'is_exposed': False,
                               'is_facet': False,
                               'is_active': False}
        self.client.login(username=self.user1_username,
                          password=self.user1_password)
        AttributeOrder.objects.all().delete()
        response = self.client.put(
            self.url_root + self.valid_uuid + '/attributes/',
            updated_attribute_1
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content,
                         b'"Could not find attribute orders to update"')
        self.client.logout()


class AssayFileAPITests(APITestCase):

    def setUp(self):
        self.user_owner = 'owner'
        self.user_guest = 'guest'
        self.fake_password = 'test1234'
        self.data_set = create_dataset_with_necessary_models()
        self.user1 = User.objects.create_user(self.user_owner, '',
                                              self.fake_password)
        self.user2 = User.objects.create_user(self.user_guest, '',
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
            measurement_accession='http://www.example.org/testID',
            measurement_source='OBI',
            technology='nucleotide sequencing',
            technology_accession='test info',
            technology_source='test source',
            platform='Genome Analyzer II',
            file_name='test_assay_filename.txt',
        )
        self.valid_uuid = str(assay.uuid)
        self.unknown_uuid = str(uuid.uuid4())
        self.url = "/api/v2/assays/{}/files/"
        self.non_meta_attributes = ['REFINERY_DOWNLOAD_URL', 'REFINERY_NAME']
        self.client = APIClient()

    def tearDown(self):
        self.client.logout()
        super(AssayFileAPITests, self).tearDown()

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_owner_with_valid_params(self, mock_format, mock_search,
                                              mock_generate):
        self.client.login(username=self.user_owner,
                          password=self.fake_password)
        mock_format.return_value = {'status': 200}
        params = {'limit': '0',
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url.format(self.valid_uuid), params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict, self.valid_uuid)
        self.assertEqual(response.status_code, 200)

    def test_get_from_owner_unknown_uuid(self):
        self.client.login(username=self.user_owner,
                          password=self.fake_password)
        params = {'limit': 0,
                  'data_set_uuid': self.unknown_uuid}
        response = self.client.get(self.url.format(self.valid_uuid), params)
        self.assertEqual(response.status_code, 404)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_no_perms(self, mock_format, mock_search,
                                    mock_generate):
        self.client.login(username=self.user_guest,
                          password=self.fake_password)
        params = {'limit': 0,
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url.format(self.valid_uuid), params)
        self.assertFalse(mock_format.called)
        self.assertFalse(mock_search.called)
        self.assertFalse(mock_generate.called)
        self.assertEqual(response.status_code, 401)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_with_read_perms(self, mock_format, mock_search,
                                           mock_generate):
        mock_format.return_value = {'status': 200}
        self.client.login(username=self.user_guest,
                          password=self.fake_password)
        assign_perm('read_%s' % DataSet._meta.model_name, self.user2,
                    self.data_set)
        params = {'limit': '0',
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url.format(self.valid_uuid), params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict, self.valid_uuid)
        self.assertEqual(response.status_code, 200)

    @mock.patch('data_set_manager.views.generate_solr_params_for_assay')
    @mock.patch('data_set_manager.views.search_solr')
    @mock.patch('data_set_manager.views.format_solr_response')
    def test_get_from_user_with_read_meta_perms(self, mock_format, mock_search,
                                                mock_generate):
        mock_format.return_value = {'status': 200}
        self.client.login(username=self.user_guest,
                          password=self.fake_password)
        assign_perm('read_meta_%s' % DataSet._meta.model_name, self.user2,
                    self.data_set)
        params = {'limit': '0',
                  'data_set_uuid': self.data_set.uuid}
        response = self.client.get(self.url.format(self.valid_uuid), params)
        self.assertTrue(mock_format.called)
        self.assertTrue(mock_search.called)
        qdict = QueryDict('', mutable=True)
        qdict.update(params)
        mock_generate.assert_called_once_with(qdict, self.valid_uuid,
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
            json.loads(response.content.decode()),
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
            json.loads(response.content.decode()),
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
            json.loads(response.content.decode()),
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
            json.loads(response.content.decode()),
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
            json.loads(response.content.decode()),
            {
                "data_files_to_be_deleted": ["test1.txt"],
                "data_files_not_uploaded": ["fake.txt"]
            }
        )


class NodeViewAPIV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(NodeViewAPIV2Tests, self).setUp(
            api_base_name="nodes/",
            view=NodeViewSet.as_view({'get': 'retrieve'})
        )
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.hg_19_data_set = create_mock_hg_19_data_set(user=self.user)
        self.isatab_9909_data_set = create_mock_isatab_9909_data_set(
            user=self.user
        )
        self.node = self.data_set.get_nodes()[0]
        self.get_list_view = NodeViewSet.as_view({'get': 'list'})
        self.patch_view = NodeViewSet.as_view({'patch': 'partial_update'})
        self.study_uuid = self.hg_19_data_set.get_studies()[0].uuid

    def test_get_without_study_uuid_returns_400(self):
        get_request = self.factory.get(self.url_root, {})
        get_response = self.get_list_view(get_request)
        self.assertEqual(get_response.status_code, 400)

    def test_get_with_incorrect_study_uuid_returns_404(self):
        get_request = self.factory.get(
            self.url_root,
            {'study_uuid': self.hg_19_data_set.uuid}
        )
        get_response = self.get_list_view(get_request)
        self.assertEqual(get_response.status_code, 404)

    def test_get_with_study_uuid_returns_401(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_response = self.get_list_view(get_request)
        self.assertEqual(get_response.status_code, 401)

    def test_get_with_study_uuid_returns_study_nodes(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        self.assertEqual(len(get_response.data),
                         len(self.hg_19_data_set.get_nodes()))
        for node in get_response.data:
            self.assertIn(
                node.get('uuid'),
                self.hg_19_data_set.get_nodes().values_list('uuid', flat=True)
            )

    def test_get_with_study_uuid_returns_children_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('children'),
            Node.objects.get(uuid=first_node.get('uuid')).get_children()
        )

    def test_get_with_study_uuid_returns_parents_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('parents'),
            Node.objects.get(uuid=first_node.get('uuid')).get_parents()
        )

    def test_get_with_study_uuid_returns_file_uuid_field(self):
        nodes = self.hg_19_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.RAW_DATA_FILE, name='s5_p42_E2_45min.fastq.gz'
        )[0]
        file_item_uuid = file_node.file_item.uuid

        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        file_node_response = None
        for node in get_response.data:
            if file_node.uuid == node.get('uuid'):
                file_node_response = node
                break

        self.assertEqual(
            file_item_uuid,
            file_node_response.get('file_uuid')
        )

    def test_get_with_study_uuid_returns_name_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(first_node.get('name'),
                         Node.objects.get(uuid=first_node.get('uuid')).name)

    def test_get_with_study_uuid_returns_type_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(first_node.get('type'),
                         Node.objects.get(uuid=first_node.get('uuid')).type)

    def test_get_with_study_uuid_returns_genome_build_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('genome_build'),
            Node.objects.get(uuid=first_node.get('uuid')).genome_build
        )

    def test_get_with_study_uuid_returns_species_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(first_node.get('species'),
                         Node.objects.get(uuid=first_node.get('uuid')).species)

    def test_get_with_study_uuid_returns_is_annotation_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('is_annotation'),
            Node.objects.get(uuid=first_node.get('uuid')).is_annotation
        )

    def test_get_with_study_uuid_returns_analysis_uuid_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('analysis_uuid'),
            Node.objects.get(uuid=first_node.get('uuid')).analysis_uuid
        )

    def test_get_with_study_uuid_returns_is_auxiliary_node_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('is_auxiliary_node'),
            Node.objects.get(uuid=first_node.get('uuid')).is_auxiliary_node
        )

    def test_get_with_study_uuid_returns_subanalysis_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('subanalysis'),
            Node.objects.get(uuid=first_node.get('uuid')).subanalysis
        )

    def test_get_with_study_uuid_returns_workflow_output_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('workflow_output'),
            Node.objects.get(uuid=first_node.get('uuid')).workflow_output
        )

    def test_get_with_study_uuid_returns_study_id_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('study'),
            Node.objects.get(uuid=first_node.get('uuid')).study.id
        )

    def test_get_with_study_uuid_returns_assay_id_field(self):
        get_request = self.factory.get(self.url_root,
                                       {'study_uuid': self.study_uuid})
        get_request.user = self.user
        get_response = self.get_list_view(get_request)
        first_node = get_response.data[0]
        self.assertEqual(
            first_node.get('assay'),
            Node.objects.get(uuid=first_node.get('uuid')).assay.id
        )

    def test_get_uuid_returns_400(self):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        get_request = self.factory.get(urljoin(self.url_root, self.node.uuid))
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request, node.uuid)
        self.assertEqual(get_response.status_code, 400)

    def test_get_uuid_returns_401_non_owners(self):
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

    def test_get_uuid_returns_empty_list_for_ds_without_related_nodes(self):
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

    def test_get_uuid_returns_derived_nodes_for_ds_with_related_nodes(self):
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
        self.assertCountEqual(get_response.data, derived_nodes_uuid)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_remove_data_file_200_status(self, mock_index):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid),
            {"file_uuid": ''}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.node.uuid)
        self.assertTrue(mock_index.called)
        self.assertEqual(patch_response.status_code, 200)

    @mock.patch('core.models.DataSet.is_clean')
    def test_patch_not_clean_400_status(self, mock_clean):
        mock_clean.return_value = False
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid), {'file_uuid': ''}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 400)

    def test_patch_non_owner_401_status(self):
        self.non_owner = User.objects.create_user('Random User',
                                                  'rand_user@example.com',
                                                  self.password)
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid), {'file_uuid': ''}
        )
        force_authenticate(patch_request, user=self.non_owner)
        patch_response = self.patch_view(patch_request, self.node.uuid)
        self.assertEqual(patch_response.status_code, 401)

    def test_patch_edit_field_405_status(self):
        patch_request = self.factory.patch(
            urljoin(self.url_root, self.node.uuid), {'name': 'New Node Name'}
        )
        force_authenticate(patch_request, user=self.user)
        patch_response = self.patch_view(patch_request, self.node.uuid)
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
        self.patch_view(patch_request, node.uuid)
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
        self.patch_view(patch_request, node.uuid)
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
        self.patch_view(patch_request, node.uuid)
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
        patch_response = self.patch_view(patch_request, derived_node.uuid)
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
        patch_response = self.patch_view(patch_request, node.uuid)
        self.assertEqual(patch_response.status_code, 400)

    @mock.patch('data_set_manager.models.Node.update_solr_index')
    def test_patch_edit_annotated_node(self, update_solr_index_mock):
        nodes = self.isatab_9909_data_set.get_nodes()
        file_node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=file_node, attribute_subtype='organism part'
        )[0]
        new_value = 'cell'
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        patch_request = self.factory.patch(
            urljoin(self.url_root, file_node.uuid),
            {'attribute_solr_name': solr_name,
             'attribute_value': new_value}
        )
        force_authenticate(patch_request, user=self.user)
        self.patch_view(patch_request, file_node.uuid)
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
        self.patch_view(patch_request, file_node.uuid)
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
        self.patch_view(patch_request, file_node.uuid)
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
        self.patch_view(patch_request, file_node.uuid)
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
        with open(self.get_test_file_path('rfc-test.zip'), 'rb') as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)
        self.successful_import_assertions()

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_post_good_isa_tab_file_with_datafiles(self):
        for name in ["rfc94.txt", "rfc134.txt"]:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)

        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertEqual(
            len(investigation.get_file_store_items(local_only=True)), 3
        )

    @mock.patch.object(FileImportTask, 'delay')
    def test_node_index_update_object_called_with_proper_args(self,
                                                              delay_mock):
        with open(self.get_test_file_path('rfc-test.zip'), 'rb') as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        self.update_node_index_mock.assert_called_with(
            ANY, using="data_set_manager"
        )

    def test_post_bad_isa_tab_file(self):
        with open(self.get_test_file_path('HideLabBrokenA.zip'), 'rb') \
                as bad_isa:
            self.post_isa_tab(isa_tab_file=bad_isa)
        self.unsuccessful_import_assertions()

    def test_post_bad_isa_tab_url(self):
        self.post_isa_tab(isa_tab_url="non-existant-file")
        self.unsuccessful_import_assertions()

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_metadata_revision_works_grammatical_changes_only(self):
        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        self.assertFalse(
            AnnotatedNode.objects.filter(attribute_value="EDITED")
        )

        with open(self.get_test_file_path('rfc-test-local-edited.zip'), 'rb') \
                as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)
        self.assertTrue(
            AnnotatedNode.objects.filter(attribute_value="EDITED")
        )

    @override_settings(CELERY_ALWAYS_EAGER=True, REFINERY_S3_USER_DATA=False)
    def test_metadata_revision_works_existing_datafiles_persisted(self):
        local_data_file_names = ["rfc94.txt", "rfc134.txt"]
        for name in local_data_file_names:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        with open(self.get_test_file_path('rfc-test-local-edited.zip'), 'rb') \
                as f:
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

        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        local_data_file_names_for_revision = ["rfc111.txt"]
        for name in local_data_file_names_for_revision:
            open(os.path.join(self.test_user_directory, name), "a").close()

        with open(self.get_test_file_path('rfc-test-local-edited.zip'), 'rb') \
                as f:
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

        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()

        with open(self.get_test_file_path('rfc-test.zip'), 'rb') as f:
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
        with open(self.get_test_file_path('rfc-test-local.zip'), 'rb') \
                as isa_tab:
            self.post_isa_tab(isa_tab_file=isa_tab)
        data_set = DataSet.objects.last()
        with open(self.get_test_file_path('rfc-test-local-edited.zip'), 'rb') \
                as f:
            self.post_isa_tab(isa_tab_file=f, data_set_uuid=data_set.uuid)

        revised_data_set = DataSet.objects.last()
        self.assertEqual(revised_data_set.title,
                         'Request for Comments (RFC) Test Edited')

    def test_metadata_revision_fails_with_unclean_dataset(self):
        analyses, data_set = make_analyses_with_single_dataset(1, self.user)
        with open(self.get_test_file_path('rfc-test.zip'), 'rb') \
                as isa_tab_file:
            response = self.post_isa_tab(
                isa_tab_file=isa_tab_file, data_set_uuid=data_set.uuid
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.content,
                "ISA-Tab import Failure:  DataSet with UUID: {} is not clean "
                "(There have been Analyses or Visualizations performed on it) "
                "Remove these objects and try again"
                .format(data_set.uuid).encode()
            )

    def test_metadata_revision_is_only_allowed_if_data_set_owner(self):
        data_set = create_dataset_with_necessary_models()
        metadata_file_name = 'rfc-test-local.zip'
        with open(self.get_test_file_path(metadata_file_name), 'rb') \
                as isa_tab:
            response = self.post_isa_tab(isa_tab_file=isa_tab,
                                         data_set_uuid=data_set.uuid)
            self.assertEqual(response.status_code, 403)
            self.assertIn(
                b"Metadata revision is only allowed for Data Set owners",
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
            json.loads(response.content.decode()),
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
            b"Metadata revision is only allowed for Data Set owners",
            response.content
        )


class StudyViewAPIV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(StudyViewAPIV2Tests, self).setUp(api_base_name="studies/",
                                               view=StudyAPIView.as_view())
        self.data_set = create_dataset_with_necessary_models(user=self.user)

    def test_get_missing_data_set_uuid_returns_400(self):
        get_request = self.factory.get(self.url_root)
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 400)

    def test_get_returns_401_for_unauthorized_users(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        get_response = self.view(get_request)
        self.assertEqual(get_response.status_code, 401)

    def test_get_returns_public_studies_for_anon(self):
        self.data_set.share(ExtendedGroup.objects.public_group())
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('uuid'),
                         self.data_set.get_studies()[0].uuid)

    def test_get_returns_studies_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('uuid'),
                         self.data_set.get_studies()[0].uuid)

    def test_get_returns_title_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('title'),
                         self.data_set.get_studies()[0].title)

    def test_get_returns_description_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('description'),
                         self.data_set.get_studies()[0].description)

    def test_get_returns_submission_date_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('submission_date'),
                         self.data_set.get_studies()[0].submission_date)

    def test_get_returns_identifier_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('identifier'),
                         self.data_set.get_studies()[0].identifier)

    def test_get_returns_release_date_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('release_date'),
                         self.data_set.get_studies()[0].release_date)

    def test_get_returns_file_name_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('file_name'),
                         self.data_set.get_studies()[0].file_name)

    def test_get_returns_investigation_id_field_for_data_set(self):
        get_request = self.factory.get(self.url_root,
                                       {'data_set_uuid': self.data_set.uuid})
        force_authenticate(get_request, user=self.user)
        get_response = self.view(get_request)
        self.assertEqual(get_response.data[0].get('investigation'),
                         self.data_set.get_studies()[0].investigation.id)


class TakeOwnershipOfPublicDatasetViewTest(APIV2TestCase):

    def setUp(self, **kwargs):
        super(TakeOwnershipOfPublicDatasetViewTest, self).setUp(
            api_base_name="import/take_ownership/",
            view=TakeOwnershipOfPublicDatasetView.as_view()
        )
        self.username_owner = 'owner'
        self.password_owner = 'take_over'
        self.user_owner = User.objects.create_user(
            self.username_owner, 'user1@example.com', self.password_owner
        )
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.data_set.share(ExtendedGroup.objects.public_group())

    def test_take_ownership_public_datafile_returns_url_in_cookies(self):
        post_request = self.factory.post(self.url_root,
                                         {'data_set_uuid': self.data_set.uuid},
                                         'json')
        post_request.user = self.user_owner
        post_response = self.view(post_request)
        self.assertEqual(
            post_response.cookies.get('isa_tab_url').value,
            'http://www.example.com/test.csv'
        )

    def test_take_ownership_returns_400_without_current_site(self):
        Site.objects.all().delete()
        post_request = self.factory.post(self.url_root,
                                         {'data_set_uuid': self.data_set.uuid},
                                         'json')
        post_request.user = self.user_owner
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)

    @mock.patch("data_set_manager.views.build_absolute_url")
    def test_take_ownership_returns_400_without_relative_url(self, mock_url):
        def raise_error(file):
            raise ValueError(str(file))
        mock_url.side_effect = raise_error
        post_request = self.factory.post(self.url_root,
                                         {'data_set_uuid': self.data_set.uuid},
                                         'json')
        post_request.user = self.user_owner
        post_response = self.view(post_request)
        self.assertEqual(post_response.status_code, 400)
