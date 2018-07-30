import mock
import uuid
from urlparse import urljoin

from django.conf import settings
from django.contrib.auth.models import User
from django.http import QueryDict
from django.test import override_settings

from factory_boy.utils import create_dataset_with_necessary_models
from guardian.shortcuts import assign_perm
from rest_framework.test import (APIClient, APIRequestFactory, APITestCase,
                                 force_authenticate)

from core.models import DataSet, InvestigationLink
from core.test_views import APIV2TestCase
from file_store.models import FileStoreItem

from .models import Assay, AttributeOrder, Investigation, Study
from .views import AddFileToNodeView, Assays, AssaysAttributes, NodeViewSet


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


class NodeViewAPIV2Tests(APIV2TestCase):
    def setUp(self, **kwargs):
        super(NodeViewAPIV2Tests, self).setUp(
            api_base_name="nodes/",
            view=NodeViewSet.as_view()
        )
        self.data_set = create_dataset_with_necessary_models(user=self.user)
        self.node = self.data_set.get_nodes()[0]

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
