import logging
from urlparse import urljoin

from django.contrib.auth.models import User
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.http import QueryDict
from django.test import TestCase

from guardian.utils import get_anonymous_user
import requests
from rest_framework.test import (APIRequestFactory, APITestCase,
                                 force_authenticate)

from data_set_manager.models import Assay
from factory_boy.utils import create_dataset_with_necessary_models

from .utils import generate_solr_params_for_user
from .views import UserFiles

logger = logging.getLogger(__name__)


class UserFilesAPITests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = UserFiles.as_view()
        self.url_root = '/api/v2/user/files/'
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
    def test_get(self):
        response = requests.get(
            urljoin(
                self.live_server_url,
                'user/files/'
            )
        )
        self.assertIn("All Files", response.content)


class UserFilesUtilsTests(TestCase):

    def test_generate_solr_params_for_user(self):
        user = User.objects.create_user(
            'testuser', 'test@example.com', 'password')
        dataset = create_dataset_with_necessary_models()
        dataset.set_owner(user)
        assay_uuid = Assay.objects.get(study=dataset.get_latest_study()).uuid

        query = generate_solr_params_for_user(QueryDict({}), user.id)
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A%28{}%29'
                         '&facet.field=organism_Characteristics_generic_s'
                         '&facet.field=organism_Factor_Value_generic_s'
                         '&facet.field=technology_Characteristics_generic_s'
                         '&facet.field=technology_Factor_Value_generic_s'
                         '&facet.field=antibody_Characteristics_generic_s'
                         '&facet.field=antibody_Factor_Value_generic_s'
                         '&facet.field=genotype_Characteristics_generic_s'
                         '&facet.field=genotype_Factor_Value_generic_s'
                         '&facet.field=experimenter_Characteristics_generic_s'
                         '&facet.field=experimenter_Factor_Value_generic_s'
                         '&fl=%2A_generic_s'
                         '%2Cname%2Cfile_uuid%2Ctype%2Cdjango_id'
                         '&fq=type%3A%28%22Raw Data File%22 '
                         'OR %22Derived Data File%22 '
                         'OR %22Array Data File%22 '
                         'OR %22Derived Array Data File%22 '
                         'OR %22Array Data Matrix File%22 '
                         'OR%22Derived Array Data Matrix File%22%29'
                         '&fq=is_annotation%3Afalse'
                         '&start=0'
                         '&rows=10000000'
                         '&q=django_ct%3Adata_set_manager.node'
                         '&wt=json'
                         '&facet=true'
                         '&facet.limit=-1'.format(assay_uuid))
