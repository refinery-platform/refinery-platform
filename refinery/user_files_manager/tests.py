import json
import logging
from urlparse import urljoin

from django.contrib.auth.models import User
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.http import QueryDict
from django.test import RequestFactory, TestCase

from guardian.utils import get_anonymous_user
import mock
import requests
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

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
    def test_ui(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'files/'
            )
        )
        self.assertIn("All Files", response.content)

    def test_csv(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'files_download'
            )
        )
        self.assertEqual(
            response.content,
            'url,filename,organism,technology,'
            'antibody,date,genotype,experimenter\r\n'
        )


class UserFilesViewTests(TestCase):

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
                'fake-organism'
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
                'url,filename,organism,technology,'
                'antibody,date,genotype,experimenter\r\n'
                'fake-url,fake-filename,fake-organism,,,,,\r\n'
            )


class UserFilesUtilsTests(TestCase):

    def test_generate_solr_params_for_user(self):
        user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        dataset = create_dataset_with_necessary_models()
        dataset.set_owner(user)
        assay_uuid = Assay.objects.get(study=dataset.get_latest_study()).uuid

        query = generate_solr_params_for_user(QueryDict({}), user.id)
        self.assertEqual(str(query).split('&'), [
                         'fq=assay_uuid%3A%28{}%29'.format(assay_uuid),
                         'facet.field=organism_Characteristics_generic_s',
                         'facet.field=organism_Factor_Value_generic_s',
                         'facet.field=technology_Characteristics_generic_s',
                         'facet.field=technology_Factor_Value_generic_s',
                         'facet.field=antibody_Characteristics_generic_s',
                         'facet.field=antibody_Factor_Value_generic_s',
                         'facet.field=genotype_Characteristics_generic_s',
                         'facet.field=genotype_Factor_Value_generic_s',
                         'facet.field=experimenter_Characteristics_generic_s',
                         'facet.field=experimenter_Factor_Value_generic_s',
                         'fl=%2A_generic_s'
                         '%2Cname'
                         '%2C%2A_uuid'
                         '%2Ctype'
                         '%2Cdjango_id'
                         '%2CREFINERY_DOWNLOAD_URL_s',
                         'fq=type%3A%28%22Raw Data File%22 '
                         'OR %22Derived Data File%22 '
                         'OR %22Array Data File%22 '
                         'OR %22Derived Array Data File%22 '
                         'OR %22Array Data Matrix File%22 '
                         'OR%22Derived Array Data Matrix File%22%29',
                         'fq=is_annotation%3Afalse',
                         'start=0',
                         'rows=10000000',
                         'q=django_ct%3Adata_set_manager.node',
                         'wt=json',
                         'facet=true',
                         'facet.limit=-1',
                         'facet.mincount=1'])
