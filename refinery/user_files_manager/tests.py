import json
import logging
from urlparse import urljoin

from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.http import QueryDict
from django.test import RequestFactory, TestCase, override_settings

from guardian.utils import get_anonymous_user
import mock
import requests
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

import constants
from data_set_manager.models import Assay
from data_set_manager.search_indexes import NodeIndex
from factory_boy.utils import create_dataset_with_necessary_models

from .utils import generate_solr_params_for_user
from .views import UserFiles, user_files_csv

logger = logging.getLogger(__name__)


class UserFilesAPITests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = UserFiles.as_view()
        self.url_root = '/api/v2/files/'
        self.user = get_anonymous_user()

    def test_get(self):
        request = self.factory.get(self.url_root)
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(sorted(response.data.keys()), [
            'attributes',
            'facet_field_counts',
            'nodes',
            'nodes_count'
        ])


class UserFilesUITests(StaticLiveServerTestCase):
    def setUp(self):
        # recommended solution to an auth_permission error, though doc says
        # we probably won't need to call it since django will call it
        # automatically when needed
        ContentType.objects.clear_cache()

    def test_ui(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'files/'
            )
        )
        self.assertIn("All Files", response.content)

    @mock.patch('django.conf.settings.USER_FILES_COLUMNS', 'name,fake')
    def test_csv(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'files_download'
            )
        )
        self.assertEqual(
            response.content,
            'url,name,fake\r\n'
        )


class UserFilesViewTests(TestCase):

    @mock.patch('django.conf.settings.USER_FILES_COLUMNS', 'filename,fake')
    def test_user_files_csv(self):
        request = RequestFactory().get('/fake-url')
        request.user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        mock_doc = {
            NodeIndex.DOWNLOAD_URL:
                'fake-url',
            'filename_Characteristics' + NodeIndex.GENERIC_SUFFIX:
                'fake-filename',
            'organism_Factor_Value' + NodeIndex.GENERIC_SUFFIX:
                u'handles\u2013unicode'
            # Just want to exercise "_Characteristics" and "_Factor_Value":
            # Doesn't matter if the names are backwards.
        }
        with mock.patch(
            'user_files_manager.views._get_solr',
            return_value=json.dumps({
                'response': {
                    'docs': [mock_doc]
                }
            })
        ):
            response = user_files_csv(request)
            self.assertEqual(
                response.content,
                'url,filename,fake\r\n'
                'fake-url,fake-filename,\r\n'
            )


class UserFilesUtilsTests(TestCase):

    @override_settings(USER_FILES_FACETS="filetype,organism,technology,"
                                         "genotype,cell_type,antibody,"
                                         "experimenter")
    def test_generate_solr_params_for_user(self):
        user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        dataset = create_dataset_with_necessary_models()
        dataset.set_owner(user)
        assay_uuid = Assay.objects.get(study=dataset.get_latest_study()).uuid

        query = generate_solr_params_for_user(QueryDict({}), user.id)
        self.assertItemsEqual(str(query).split('&'), [
                         'fq=assay_uuid%3A%28{}%29'.format(assay_uuid),
                         'fl=%2A_generic_s'
                         '%2Cname'
                         '%2C%2A_uuid'
                         '%2Ctype'
                         '%2Cdjango_id'
                         '%2CREFINERY_DOWNLOAD_URL_s',
                         'facet.field=filetype_Characteristics_generic_s',
                         'facet.field=filetype_Factor_Value_generic_s',
                         'facet.field=organism_Characteristics_generic_s',
                         'facet.field=organism_Factor_Value_generic_s',
                         'facet.field=technology_Characteristics_generic_s',
                         'facet.field=technology_Factor_Value_generic_s',
                         'facet.field=genotype_Characteristics_generic_s',
                         'facet.field=genotype_Factor_Value_generic_s',
                         'facet.field=cell_type_Characteristics_generic_s',
                         'facet.field=cell_type_Factor_Value_generic_s',
                         'facet.field=antibody_Characteristics_generic_s',
                         'facet.field=antibody_Factor_Value_generic_s',
                         'facet.field=experimenter_Characteristics_generic_s',
                         'facet.field=experimenter_Factor_Value_generic_s',
                         'fq=is_annotation%3Afalse',
                         'start=0',
                         'rows={}'.format(constants.REFINERY_SOLR_DOC_LIMIT),
                         'q=django_ct%3Adata_set_manager.node',
                         'wt=json',
                         'facet=true',
                         'facet.limit=-1'])
