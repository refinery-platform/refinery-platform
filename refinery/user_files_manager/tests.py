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

from core.models import DataSet, InvestigationLink
from data_set_manager.models import Assay, AttributeOrder, Investigation, Study

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
    def setUp(self):
        self.user = User.objects.create_user("user", '', 'test1234')

        investigation = Investigation.objects.create()
        data_set = DataSet.objects.create(
            title="Test DataSet")
        InvestigationLink.objects.create(data_set=data_set,
                                         investigation=investigation)

        self.study = Study.objects.create(file_name='test_filename123.txt',
                                          title='Study Title Test',
                                          investigation=investigation)

        self.assay = Assay.objects.create(
                study=self.study,
                measurement='transcription factor binding site',
                measurement_accession='http://www.testurl.org/testID',
                measurement_source='OBI',
                technology='nucleotide sequencing',
                technology_accession='test info',
                technology_source='test source',
                platform='Genome Analyzer II',
                file_name='test_assay_filename.txt',
                )

        self.attribute_order_array = [{
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Character_Title',
            'rank': 1,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False,
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Specimen',
            'rank': 2,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Cell Type',
            'rank': 3,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Analysis',
            'rank': 4,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Organism',
            'rank': 5,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Cell Line',
            'rank': 6,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Type',
            'rank': 7,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Group Name',
            'rank': 8,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Gene',
            'rank': 9,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Replicate Id',
            'rank': 10,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Organism Part',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.assay,
            'solr_field': 'Name',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }]

        for attribute in self.attribute_order_array:
            AttributeOrder.objects.create(**attribute)

        self.new_assay = Assay.objects.create(
            study=self.study,
            measurement='transcription factor binding site',
            measurement_accession='http://www.testurl.org/testID',
            measurement_source='OBI',
            technology='nucleotide sequencing',
            technology_accession='test info',
            technology_source='test source',
            platform='Genome Analyzer II',
            file_name='test_assay_filename.txt',
        )

        self.new_attribute_order_array = [{
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Character_Title',
            'rank': 0,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False,
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Specimen',
            'rank': 0,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Cell Type',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Analysis',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Organism',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Cell Line',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Type',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': True
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Group Name',
            'rank': 0,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Gene',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'Replicate Id',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'uuid',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': True
        }, {
            'study': self.study,
            'assay': self.new_assay,
            'solr_field': 'name',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': True
        }]

        for attribute in self.new_attribute_order_array:
            AttributeOrder.objects.create(**attribute)

    def test_generate_solr_params_for_user(self):
        query = generate_solr_params_for_user(QueryDict({}), self.user.id)
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A%28{} OR {}%29'
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
                         '&facet.limit=-1'.format(
                             self.assay.uuid, self.new_assay.uuid))
