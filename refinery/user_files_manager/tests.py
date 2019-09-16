import json
import logging
from urllib.parse import urljoin

import uuid
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.http import QueryDict
from django.test import TestCase, override_settings

from guardian.utils import get_anonymous_user
import mock
import requests
from rest_framework.authtoken.models import Token
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from data_set_manager.models import Assay
from data_set_manager.search_indexes import NodeIndex
from factory_boy.utils import create_dataset_with_necessary_models

from .utils import generate_solr_params_for_user
from .views import UserFileAPIView, user_files_csv

logger = logging.getLogger(__name__)


class UserFileAPITests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = UserFileAPIView.as_view()
        self.url_root = '/api/v2/files/'
        self.user = get_anonymous_user()

    def test_get(self):
        request = self.factory.get(self.url_root)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(sorted(response.data.keys()), [
            'attributes',
            'facet_field_counts',
            'nodes',
            'nodes_count'
        ])

    def _test_user_files_csv(self, assay_uuid=False, use_token_auth=False):
        solr_mock_reference = 'search_solr' if assay_uuid else '_get_solr'
        get_data = {"assay_uuid": uuid.uuid4()} if assay_uuid else {}

        request = self.factory.get(
            "/files_download?fq=&limit=100000000&sort=", get_data
        )

        user = User.objects.create_user(
            'testuser', 'test@example.com', 'password'
        )
        if use_token_auth:
            Token.objects.create(user=user)
            force_authenticate(request, user=user, token=user.auth_token)
        else:
            force_authenticate(request, user=user)

        mock_doc = {
            NodeIndex.DOWNLOAD_URL:
                'fake-url',
            'filename_Characteristics' + NodeIndex.GENERIC_SUFFIX:
                'fake-filename',
            'organism_Factor_Value' + NodeIndex.GENERIC_SUFFIX:
                'handles\u2013unicode'
            # Just want to exercise "_Characteristics" and "_Factor_Value":
            # Doesn't matter if the names are backwards.
        }
        with mock.patch(
                'user_files_manager.views.' + solr_mock_reference,
                return_value=json.dumps({
                    'response': {
                        'docs': [mock_doc]
                    }
                })
        ):
            response = user_files_csv(request)
            self.assertEqual(
                response.content,
                b'url,filename,fake\r\nfake-url,fake-filename,\r\n'
            )

    @override_settings(USER_FILES_COLUMNS='filename,fake')
    def test_get_user_files_csv_with_token_auth(self):
        self._test_user_files_csv(use_token_auth=True)

    @override_settings(USER_FILES_COLUMNS='filename,fake')
    def test_get_user_files_csv_with_session_auth(self):
        self._test_user_files_csv()

    @override_settings(USER_FILES_COLUMNS='filename,fake')
    def test_get_user_files_csv_without_auth(self):
        request = self.factory.get("/files_download?fq=&limit=100000000&sort=")
        User.objects.create_user('testuser', 'test@example.com', 'password')
        response = user_files_csv(request)
        response.render()
        self.assertEqual(response.status_code, 403)

    @override_settings(USER_FILES_COLUMNS='filename,fake')
    def test_get_user_files_csv_with_assay_uuid(self):
        self._test_user_files_csv(assay_uuid=True)


class UserFilesUITests(StaticLiveServerTestCase):
    def setUp(self):
        # recommended solution to an auth_permission error, though doc says
        # we probably won't need to call it since django will call it
        # automatically when needed
        ContentType.objects.clear_cache()

        self.factory = APIRequestFactory()
        self.view = user_files_csv

    def test_ui(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'files/'
            )
        )
        self.assertIn("All Files", response.content)

    @override_settings(USER_FILES_COLUMNS='name,fake')
    def test_csv(self):
        password = make_password("password")
        user = User.objects.create_user(
            'testuser', 'test@example.com', password
        )
        Token.objects.create(user=user)
        request = self.factory.get(
            urljoin(self.live_server_url, 'files_download')
        )
        force_authenticate(request, user=user, token=user.auth_token)
        response = self.view(request)
        self.assertEqual(
            response.content,
            b'url,name,fake\r\n'
        )


class UserFilesUtilsTests(TestCase):
    @override_settings(USER_FILES_FACETS="filetype,organism,technology,"
                                         "genotype,cell_type,antibody,"
                                         "experimenter")
    def setUp(self):
        self.user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        self.dataset = create_dataset_with_necessary_models()
        self.dataset.set_owner(self.user)
        self.assay_uuid = Assay.objects.get(
            study=self.dataset.get_latest_study()
        ).uuid

    def test_generate_solr_params_for_user_returns_obj(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertCountEqual(list(query.keys()), ['json', 'params'])

    def test_generate_solr_params_for_user_returns_params(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertCountEqual(query.get('params'),
                              {
                                  'facet.limit': '-1',
                                  'fq': 'is_annotation:false',
                                  'rows': '1000',
                                  'start': '0',
                                  'wt': 'json'
                              })

    def test_generate_solr_params_for_user_returns_json_facet(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertCountEqual(list(query.get('json').get('facet').keys()),
                              ['antibody_Characteristics_generic_s',
                               'technology_Characteristics_generic_s',
                               'cell_type_Characteristics_generic_s',
                               'organism_Characteristics_generic_s',
                               'genotype_Characteristics_generic_s',
                               'filetype_Characteristics_generic_s',
                               'experimenter_Characteristics_generic_s']
                              )

    def test_generate_solr_params_for_user_returns_json_fields(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertListEqual(query.get('json').get('fields'),
                             ['*_generic_s',
                              'name',
                              '*_uuid',
                              'uuid',
                              'type',
                              'django_id',
                              'REFINERY_DOWNLOAD_URL_s',
                              'filetype_Characteristics_generic_s',
                              'organism_Characteristics_generic_s',
                              'technology_Characteristics_generic_s',
                              'genotype_Characteristics_generic_s',
                              'cell_type_Characteristics_generic_s',
                              'antibody_Characteristics_generic_s',
                              'experimenter_Characteristics_generic_s']
                             )

    def test_generate_solr_params_for_user_returns_json_filter(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertListEqual(query.get('json').get('filter'),
                             ['assay_uuid:({})'.format(self.assay_uuid)]
                             )

    def test_generate_solr_params_for_user_returns_json_query(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertEqual(query.get('json').get('query'),
                         'django_ct:data_set_manager.node')
