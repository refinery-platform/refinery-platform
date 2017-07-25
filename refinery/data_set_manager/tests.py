from StringIO import StringIO
import json
import re

from django.contrib.auth.models import User
from django.core.files.uploadedfile import (InMemoryUploadedFile,
                                            SimpleUploadedFile)
from django.http import QueryDict
from django.test import TestCase

from rest_framework.test import APIClient, APIRequestFactory, APITestCase

from core.models import DataSet, ExtendedGroup, InvestigationLink
from core.views import NodeViewSet
from data_set_manager.tasks import parse_isatab
from file_store.models import FileStoreItem

from .models import (AnnotatedNode, Assay, Attribute, AttributeOrder,
                     Investigation, Node, Study)
from .search_indexes import NodeIndex
from .serializers import AttributeOrderSerializer
from .utils import (create_facet_filter_query, customize_attribute_response,
                    escape_character_solr, format_solr_response,
                    generate_facet_fields_query,
                    generate_filtered_facet_fields,
                    generate_solr_params_for_assay,
                    get_file_url_from_node_uuid, get_owner_from_assay,
                    hide_fields_from_list, initialize_attribute_order_ranks,
                    insert_facet_field_filter, is_field_in_hidden_list,
                    objectify_facet_field_counts, update_attribute_order_ranks)
from .views import Assays, AssaysAttributes


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


class UtilitiesTest(TestCase):

    def setUp(self):
        self.user1 = User.objects.create_user("ownerJane", '', 'test1234')
        self.user1.save()
        investigation = Investigation.objects.create()
        data_set = DataSet.objects.create(
                title="Test DataSet")
        InvestigationLink.objects.create(data_set=data_set,
                                         investigation=investigation)
        data_set.set_owner(self.user1)
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

        self.url_root = '/api/v2/assays'
        self.valid_uuid = self.assay.uuid
        self.invalid_uuid = 'xxxxxxxx'

        test_file_a = StringIO()
        test_file_a.write('Coffee is great.\n')
        file_store_item_a = FileStoreItem.objects.create(
            datafile=InMemoryUploadedFile(
                test_file_a,
                field_name='tempfile',
                name='test_file_a.txt',
                content_type='text/plain',
                size=len(test_file_a.getvalue()),
                charset='utf-8'
            )
        )
        self.node_a = Node.objects.create(
            name="n0",
            assay=self.assay,
            study=self.study,
            file_uuid=file_store_item_a.uuid
        )

        self.node_b = Node.objects.create(
            name="n1",
            assay=self.assay,
            study=self.study
        )

    def tearDown(self):
        # Trigger the pre_delete signal so that datafiles are purged
        FileStoreItem.objects.all().delete()

    def test_objectify_facet_field_counts(self):
        facet_field_array = {'WORKFLOW': ['1_test_04', 1,
                                          'output_file', 60,
                                          '1_test_02', 1],
                             'ANALYSIS': ['5dd6d3c3', 5,
                                          '08fc3964', 2,
                                          '0907a312', 1,
                                          '276adefd', 3],
                             'Author': ['Vezza', 10,
                                        'Harslem/Heafner', 4,
                                        'McConnell', 5,
                                        'Vezza + Crocker', 2,
                                        'Crocker', 28],
                             'Year': ['1971', 54],
                             'SUBANALYSIS': ['1', 8, '2', 2, '-1', 9],
                             'TYPE': ['Derived Data File', 105,
                                      'Raw Data File', 9]}

        facet_field_obj = objectify_facet_field_counts(facet_field_array)
        self.assertDictEqual(facet_field_obj,
                             {'WORKFLOW': [
                                      {'name': 'output_file', 'count': 60},
                                      {'name': '1_test_04', 'count': 1},
                                      {'name': '1_test_02', 'count': 1}],
                              'ANALYSIS': [{'name': '5dd6d3c3', 'count': 5},
                                           {'name': '276adefd', 'count': 3},
                                           {'name': '08fc3964', 'count': 2},
                                           {'name': '0907a312', 'count': 1}],
                              'Author': [
                                  {'name': 'Crocker', 'count': 28},
                                  {'name': 'Vezza', 'count': 10},
                                  {'name': 'McConnell', 'count': 5},
                                  {'name': 'Harslem/Heafner', 'count': 4},
                                  {'name': 'Vezza + Crocker', 'count': 2}],
                              'Year': [{'name': '1971', 'count': 54}],
                              'SUBANALYSIS': [{'name': '-1', 'count': 9},
                                              {'name': '1', 'count': 8},
                                              {'name': '2', 'count': 2}],
                              'TYPE': [
                                  {'name': 'Derived Data File', 'count': 105},
                                  {'name': 'Raw Data File', 'count': 9}]})

    def test_escape_character_solr(self):
        field = "(mouse){index}[dog]^~*?:;/ +-&|"
        expected_response = "\\(mouse\\)\\{index\\}\\[" \
                            "dog\\]\\^\\~\\*\\?\\:\\;\\/\\ \\+\\-\\&\\|"
        response = escape_character_solr(field)
        self.assertEqual(response, expected_response)
        response = escape_character_solr("")
        self.assertEqual(response, "")

    def test_insert_facet_field_filter(self):
        facet_filter = u'{"Author": ["Vezza", "McConnell"]}'
        facet_field_array = ['WORKFLOW', 'ANALYSIS', 'Author', 'Year']
        response = ['WORKFLOW', 'ANALYSIS', u'{!ex=Author}Author', 'Year']
        edited_facet_field_list = insert_facet_field_filter(
                facet_filter, facet_field_array)
        self.assertListEqual(edited_facet_field_list, response)
        edited_facet_field_list = insert_facet_field_filter(
                None, facet_field_array)
        self.assertListEqual(edited_facet_field_list, response)

    def test_create_facet_filter_query(self):
        facet_filter = {'Author': ['Vezza', 'McConnell'],
                        'TYPE': ['Raw Data File']}
        facet_field_query = create_facet_filter_query(facet_filter)
        self.assertEqual(facet_field_query,
                         u'&fq={!tag=TYPE}TYPE:(Raw\\ Data\\ File)'
                         u'&fq={!tag=Author}Author:(Vezza OR McConnell)')

    def test_hide_fields_from_list(self):
        weighted_list = [{'solr_field': 'uuid'},
                         {'solr_field': 'is_annotation'},
                         {'solr_field': 'genome_build'},
                         {'solr_field': 'django_ct'},
                         {'solr_field': 'django_id'},
                         {'solr_field': 'species'},
                         {'solr_field': 'file_uuid'},
                         {'solr_field': 'study_uuid'},
                         {'solr_field': 'assay_uuid'},
                         {'solr_field': 'type'},
                         {'solr_field': 'id'},
                         {'solr_field': 'name'},
                         {'solr_field': 'SubAnalysis'}]

        filtered_list = hide_fields_from_list(weighted_list)
        self.assertListEqual(filtered_list, [
            {'solr_field': 'uuid'},
            {'solr_field': 'SubAnalysis'}])

    def test_is_field_in_hidden_list(self):
        list_of_hidden_field = ['id', 'django_id', 'file_uuid',
                                'study_uuid', 'assay_uuid', 'type',
                                'is_annotation', 'species', 'genome_build',
                                'name', 'django_ct']
        list_not_hidden_field = ['uuid', 'Analysis', 'Cell Type', '',
                                 'Cell Line', 'Group Name', 'Character Title']

        for field in list_of_hidden_field:
            self.assertEqual(is_field_in_hidden_list(field), True)

        for field in list_not_hidden_field:
            self.assertEqual(is_field_in_hidden_list(field), False)

    def test_generate_solr_params_no_params(self):
        # empty params
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A%28{}%29'
                         '&facet.field=Cell Type'
                         '&facet.field=Analysis'
                         '&facet.field=Organism'
                         '&facet.field=Cell Line'
                         '&facet.field=Type'
                         '&facet.field=Group Name'
                         '&fl=Character_Title%2C'
                         'Specimen%2C'
                         'Cell Type%2C'
                         'Analysis%2C'
                         'Organism%2C'
                         'Cell Line%2C'
                         'Type%2C'
                         'Group Name'
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
                                 self.valid_uuid))

    def test_generate_solr_params_for_assay_with_params(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        parameter_dict = {'limit': 7, 'offset': 2,
                          'include_facet_count': 'true',
                          'attributes': 'cats,mouse,dog,horse',
                          'facets': 'cats,mouse,dog,horse',
                          'pivots': 'cats,mouse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(
            parameter_qdict, self.valid_uuid
        )
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A%28{}%29'
                         '&facet.field=cats'
                         '&facet.field=mouse'
                         '&facet.field=dog'
                         '&facet.field=horse'
                         '&fl=cats%2Cmouse%2Cdog%2Chorse'
                         '&facet.pivot=cats%2Cmouse'
                         '&fq=type%3A%28%22Raw Data File%22 '
                         'OR %22Derived Data File%22 '
                         'OR %22Array Data File%22 '
                         'OR %22Derived Array Data File%22 '
                         'OR %22Array Data Matrix File%22 '
                         'OR%22Derived Array Data Matrix File%22%29'
                         '&fq=is_annotation%3Atrue'
                         '&start=2'
                         '&rows=7'
                         '&q=django_ct%3Adata_set_manager.node'
                         '&wt=json'
                         '&facet=true'
                         '&facet.limit=-1'.format(
                                 self.valid_uuid))

    def test_generate_filtered_facet_fields(self):
        attribute_orders = AttributeOrder.objects.filter(
                assay__uuid=self.valid_uuid)
        attributes = AttributeOrderSerializer(attribute_orders, many=True)
        filtered = generate_filtered_facet_fields(attributes.data)
        self.assertDictEqual(filtered, {'facet_field':
                                        ['Cell Type', 'Analysis',
                                         'Organism', 'Cell Line',
                                         'Type', 'Group Name'],
                                        'field_limit':
                                        ['Character_Title', 'Specimen',
                                         'Cell Type', 'Analysis',
                                         'Organism', 'Cell Line',
                                         'Type', 'Group Name']})

    def test_generate_facet_fields_query(self):
        facet_field_string = ['REFINERY_SUBANALYSIS_6_3_s',
                              'REFINERY_WORKFLOW_OUTPUT_6_3_s',
                              'REFINERY_ANALYSIS_UUID_6_3_s',
                              'Author_Characteristics_6_3_s',
                              'Year_Characteristics_6_3_s']

        str_query = generate_facet_fields_query(facet_field_string)
        self.assertEqual(str_query,
                         '&facet.field=REFINERY_SUBANALYSIS_6_3_s'
                         '&facet.field=REFINERY_WORKFLOW_OUTPUT_6_3_s'
                         '&facet.field=REFINERY_ANALYSIS_UUID_6_3_s'
                         '&facet.field=Author_Characteristics_6_3_s'
                         '&facet.field=Year_Characteristics_6_3_s')

    def test_get_owner_from_valid_assay(self):
        owner = get_owner_from_assay(self.valid_uuid).username
        # valid owner with valid uuid
        self.assertEqual(str(owner), 'ownerJane')

    def test_get_owner_from_invalid_assay(self):
        # invalid uuid
        response = get_owner_from_assay(self.invalid_uuid)
        self.assertEqual(response, 'Error: Invalid uuid')

    def test_format_solr_response_valid(self):
        # valid input, expected response from solr
        solr_response = '{"responseHeader":{"status": 0, "params":' \
                        '{"facet": "true", "facet.mincount": "1",' \
                        '"start": "0",'\
                        '"q": "django_ct:data_set_manager.node",'\
                        '"facet.limit": "-1",'\
                        '"facet.field":'\
                        '["REFINERY_TYPE_6_3_s",'\
                        '"REFINERY_SUBANALYSIS_6_3_s",'\
                        '"REFINERY_WORKFLOW_OUTPUT_6_3_s",'\
                        '"REFINERY_ANALYSIS_UUID_6_3_s",'\
                        '"Author_Characteristics_6_3_s",'\
                        '"Year_Characteristics_6_3_s"],'\
                        '"fl":'\
                        '"REFINERY_TYPE_6_3_s,'\
                        'REFINERY_SUBANALYSIS_6_3_s,'\
                        'REFINERY_WORKFLOW_OUTPUT_6_3_s,'\
                        'REFINERY_ANALYSIS_UUID_6_3_s,'\
                        'Author_Characteristics_6_3_s,'\
                        'Year_Characteristics_6_3_s",'\
                        '"wt": "json", "rows": "20"}},'\
                        '"response": {'\
                        '"numFound": 1, "offset": 0,'\
                        '"docs": ['\
                        '{"Author_Characteristics_6_3_s": "Crocker",'\
                        '"REFINERY_ANALYSIS_UUID_6_3_s": "N/A",'\
                        '"REFINERY_WORKFLOW_OUTPUT_6_3_s": "N/A",'\
                        '"REFINERY_SUBANALYSIS_6_3_s": "-1",'\
                        '"Year_Characteristics_6_3_s": "1971",'\
                        '"REFINERY_TYPE_6_3_s": "Raw Data File"}]},'\
                        '"facet_counts": {"facet_queries": {},'\
                        '"facet_fields": {'\
                        '"REFINERY_TYPE_6_3_s":'\
                        '["Derived Data File", 105,'\
                        '"Raw Data File", 9],'\
                        '"REFINERY_SUBANALYSIS_6_3_s":'\
                        '["-1", 9, "0", 95, "1", 8, "2", 2]},'\
                        '"facet_dates": {}, "facet_ranges": {},'\
                        '"facet_intervals": {}, "facet_heatmaps": {}}}'

        formatted_response = format_solr_response(solr_response)
        self.assertDictEqual(
                formatted_response,
                {
                    'facet_field_counts':
                        {u'REFINERY_SUBANALYSIS_6_3_s':
                            [{'name': u'0', 'count': 95},
                             {'name': u'-1', 'count': 9},
                             {'name': u'1', 'count': 8},
                             {'name': u'2', 'count': 2}
                             ],
                         u'REFINERY_TYPE_6_3_s':
                            [{'name': u'Derived Data File', 'count': 105},
                             {'name': u'Raw Data File', 'count': 9}]},
                    'attributes': [{
                         'attribute_type': 'Internal',
                         'display_name': u'Type',
                         'file_ext': u's',
                         'internal_name': u'REFINERY_TYPE_6_3_s'},
                         {'attribute_type': 'Internal',
                          'display_name': 'Analysis Group',
                          'file_ext': u's',
                          'internal_name': u'REFINERY_SUBANALYSIS_6_3_s'},
                         {'attribute_type': 'Internal',
                          'display_name': 'Output Type',
                          'file_ext': u's',
                          'internal_name': u'REFINERY_WORKFLOW_OUTPUT_6_3_s'},
                         {'attribute_type': 'Internal',
                          'display_name': u'Analysis',
                          'file_ext': u's',
                          'internal_name': u'REFINERY_ANALYSIS_UUID_6_3_s'},
                         {'attribute_type': 'Characteristics',
                          'display_name': u'Author',
                          'file_ext': u's',
                          'internal_name': u'Author_Characteristics_6_3_s'},
                         {'attribute_type': 'Characteristics',
                          'display_name': u'Year',
                          'file_ext': u's',
                          'internal_name': u'Year_Characteristics_6_3_s'}],
                    'nodes_count': 1,
                    'nodes': [{
                         u'REFINERY_WORKFLOW_OUTPUT_6_3_s': u'N/A',
                         u'REFINERY_ANALYSIS_UUID_6_3_s': u'N/A',
                         u'Author_Characteristics_6_3_s': u'Crocker',
                         u'Year_Characteristics_6_3_s': u'1971',
                         u'REFINERY_SUBANALYSIS_6_3_s': u'-1',
                         u'REFINERY_TYPE_6_3_s': u'Raw Data File'}]
                }
        )

    def test_format_solr_response_invalid(self):
        # invalid input, do not mask error
        solr_response = {"test_object": "not a string"}
        with self.assertRaises(TypeError):
            format_solr_response(solr_response)

    def test_customize_attribute_response_for_generics(self):
        attributes = ['technology_Characteristics_generic_s',
                      'antibody_Factor_Value_generic_s']
        prettified_attributes = customize_attribute_response(attributes)
        self.assertListEqual(
            prettified_attributes,
            [{'attribute_type': 'Characteristics',
              'display_name': 'Technology',
              'file_ext': 's',
              'internal_name': 'technology_Characteristics_generic_s'},
             {'attribute_type': 'Factor Value',
              'display_name': 'Antibody',
              'file_ext': 's',
              'internal_name': 'antibody_Factor_Value_generic_s'}])

    def test_customize_attribute_response(self):
        # valid input
        attributes = ['REFINERY_FILETYPE_6_3_s',
                      'Title_Characteristics_6_3_s',
                      'REFINERY_TYPE_6_3_s',
                      'REFINERY_SUBANALYSIS_6_3_s',
                      'Month_Characteristics_6_3_s',
                      'REFINERY_NAME_6_3_s',
                      'REFINERY_WORKFLOW_OUTPUT_6_3_s',
                      'REFINERY_ANALYSIS_UUID_6_3_s',
                      'Author_Characteristics_6_3_s',
                      'Year_Characteristics_6_3_s']

        prettified_attributes = customize_attribute_response(attributes)
        self.assertListEqual(
                prettified_attributes,
                [{'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'File Type',
                  'internal_name': 'REFINERY_FILETYPE_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Title',
                  'internal_name': 'Title_Characteristics_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Type',
                  'internal_name': 'REFINERY_TYPE_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Analysis Group',
                  'internal_name': 'REFINERY_SUBANALYSIS_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Month',
                  'internal_name': 'Month_Characteristics_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Name',
                  'internal_name': 'REFINERY_NAME_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Output Type',
                  'internal_name': 'REFINERY_WORKFLOW_OUTPUT_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Analysis',
                  'internal_name': 'REFINERY_ANALYSIS_UUID_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Author',
                  'internal_name': 'Author_Characteristics_6_3_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Year',
                  'internal_name': 'Year_Characteristics_6_3_s'}])

        # another valid input
        attributes = ['treatment_Factor_Value_22_11_s',
                      'treatment_Characteristics_22_11_s',
                      'REFINERY_NAME_22_11_s',
                      'strain_Characteristics_22_11_s',
                      'organism_Characteristics_22_11_s',
                      'REFINERY_WORKFLOW_OUTPUT_22_11_s',
                      'Replicate_Id_Comment_22_11_s',
                      'REFINERY_ANALYSIS_UUID_22_11_s',
                      'REFINERY_FILETYPE_22_11_s',
                      'cell_line_Factor_Value_22_11_s',
                      'cell_line_Characteristics_22_11_s',
                      'Group_Name_Comment_22_11_s',
                      'REFINERY_TYPE_22_11_s',
                      'REFINERY_SUBANALYSIS_22_11_s']

        prettified_attributes = customize_attribute_response(attributes)
        self.assertListEqual(
                prettified_attributes,
                [{'file_ext': 's',
                  'attribute_type': 'Factor Value',
                  'display_name': 'Treatment',
                  'internal_name': 'treatment_Factor_Value_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Treatment',
                  'internal_name': 'treatment_Characteristics_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Name',
                  'internal_name': 'REFINERY_NAME_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Strain',
                  'internal_name': 'strain_Characteristics_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Organism',
                  'internal_name': 'organism_Characteristics_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Output Type',
                  'internal_name': 'REFINERY_WORKFLOW_OUTPUT_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Comment',
                  'display_name': 'Replicate Id',
                  'internal_name': 'Replicate_Id_Comment_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Analysis',
                  'internal_name': 'REFINERY_ANALYSIS_UUID_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'File Type',
                  'internal_name': 'REFINERY_FILETYPE_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Factor Value',
                  'display_name': 'Cell Line',
                  'internal_name': 'cell_line_Factor_Value_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Characteristics',
                  'display_name': 'Cell Line',
                  'internal_name': 'cell_line_Characteristics_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Comment',
                  'display_name': 'Group Name',
                  'internal_name': 'Group_Name_Comment_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Type',
                  'internal_name': 'REFINERY_TYPE_22_11_s'},
                 {'file_ext': 's',
                  'attribute_type': 'Internal',
                  'display_name': 'Analysis Group',
                  'internal_name': 'REFINERY_SUBANALYSIS_22_11_s'}])

    def test_initialize_attribute_order_ranks_up(self):
        # Updates a new attribute order ranks
        expect_attribute_order = {
            'Character_Title': 1,
            'Specimen': 8,
            'Cell Type': 2,
            'Analysis': 3,
            'Organism': 4,
            'Cell Line': 5,
            'Type': 0,
            'Group Name': 6,
            'Gene': 7,
            'Replicate Id': 9,
            'uuid': 0,
            'name': 0,
            }

        selected_attribute = AttributeOrder.objects.get(assay=self.new_assay,
                                                        solr_field='Specimen')
        initialize_attribute_order_ranks(selected_attribute, 8)
        ranked_attribute_list = AttributeOrder.objects.filter(
            assay=self.new_assay)

        for attribute in ranked_attribute_list:
            self.assertEqual(attribute.rank,
                             expect_attribute_order[attribute.solr_field])

    def test_initialize_attribute_order_ranks_down(self):
        # Updates a new attribute order ranks
        expect_attribute_order = {
            'Character_Title': 1,
            'Specimen': 3,
            'Cell Type': 4,
            'Analysis': 5,
            'Organism': 6,
            'Cell Line': 7,
            'Type': 0,
            'Group Name': 8,
            'Gene': 2,
            'Replicate Id': 9,
            'uuid': 0,
            'name': 0,
            }

        selected_attribute = AttributeOrder.objects.get(assay=self.new_assay,
                                                        solr_field='Gene')
        initialize_attribute_order_ranks(selected_attribute, 2)
        ranked_attribute_list = AttributeOrder.objects.filter(
            assay=self.new_assay)

        for attribute in ranked_attribute_list:
            self.assertEqual(attribute.rank,
                             expect_attribute_order[attribute.solr_field])

    def test_initialize_attribute_order_ranks_zero(self):
        # Updates a new attribute order ranks
        expect_attribute_order = {
            'Character_Title': 1,
            'Specimen': 2,
            'Cell Type': 3,
            'Analysis': 4,
            'Organism': 5,
            'Cell Line': 6,
            'Type': 0,
            'Group Name': 7,
            'Gene': 0,
            'Replicate Id': 8,
            'uuid': 0,
            'name': 0,
            }

        selected_attribute = AttributeOrder.objects.get(assay=self.new_assay,
                                                        solr_field='Gene')
        initialize_attribute_order_ranks(selected_attribute, 0)
        ranked_attribute_list = AttributeOrder.objects.filter(
            assay=self.new_assay)

        for attribute in ranked_attribute_list:
            self.assertEqual(attribute.rank,
                             expect_attribute_order[attribute.solr_field])

    def test_update_attribute_order_ranks(self):
        # Test basic increase
        expected_order = {'Character_Title': 5,
                          'Specimen': 1,
                          'Cell Type': 2,
                          'Analysis':  3,
                          'Organism': 4,
                          'Cell Line': 6,
                          'Type': 7,
                          'Group Name': 8,
                          'Gene': 9,
                          'Replicate Id': 10,
                          'Organism Part': 0,
                          'Name': 0}

        attribute_order = AttributeOrder.objects.get(
                assay=self.assay,
                solr_field='Character_Title')
        new_rank = 5
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

        # Test top edge case
        expected_order = {'Character_Title': 10,
                          'Specimen': 1,
                          'Cell Type': 2,
                          'Analysis':  3,
                          'Organism': 4,
                          'Cell Line': 5,
                          'Type': 6,
                          'Group Name': 7,
                          'Gene': 8,
                          'Replicate Id': 9,
                          'Organism Part': 0,
                          'Name': 0}
        attribute_order = AttributeOrder.objects.get(
                assay=self.assay,
                solr_field='Character_Title')
        new_rank = 10
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

        # Test bottom edge case
        expected_order = {'Character_Title': 1,
                          'Specimen': 2,
                          'Cell Type': 3,
                          'Analysis':  4,
                          'Organism': 5,
                          'Cell Line': 6,
                          'Type': 7,
                          'Group Name': 8,
                          'Gene': 9,
                          'Replicate Id': 10,
                          'Organism Part': 0,
                          'Name': 0}
        attribute_order = AttributeOrder.objects.get(
                assay=self.assay,
                solr_field='Character_Title')
        new_rank = 1
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

        # Test removing a rank to 0
        expected_order = {'Character_Title': 0,
                          'Specimen': 1,
                          'Cell Type': 2,
                          'Analysis':  3,
                          'Organism': 4,
                          'Cell Line': 5,
                          'Type': 6,
                          'Group Name': 7,
                          'Gene': 8,
                          'Replicate Id': 9,
                          'Organism Part': 0,
                          'Name': 0}
        attribute_order = AttributeOrder.objects.\
            get(assay=self.assay, solr_field='Character_Title')
        new_rank = 0
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

        # Test multiple changes, including inserting field back in rank order
        expected_order = {'Character_Title': 7,
                          'Specimen': 1,
                          'Cell Type': 2,
                          'Analysis':  4,
                          'Organism': 5,
                          'Cell Line': 6,
                          'Type': 10,
                          'Group Name': 8,
                          'Gene': 9,
                          'Replicate Id': 11,
                          'Organism Part': 0,
                          'Name': 3}
        attribute_order = AttributeOrder.objects.\
            get(assay=self.assay, solr_field='Character_Title')
        new_rank = 7
        update_attribute_order_ranks(attribute_order, new_rank)
        AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(
                                                    assay=self.assay,
                                                    solr_field='Type')
        new_rank = 9
        update_attribute_order_ranks(attribute_order, new_rank)
        AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(
                                                    assay=self.assay,
                                                    solr_field='Name')
        new_rank = 3
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

        # Test small rank change
        expected_order = {'Character_Title': 7,
                          'Specimen': 1,
                          'Cell Type': 2,
                          'Analysis':  4,
                          'Organism': 6,
                          'Cell Line': 5,
                          'Type': 10,
                          'Group Name': 8,
                          'Gene': 9,
                          'Replicate Id': 11,
                          'Organism Part': 0,
                          'Name': 3}
        attribute_order = AttributeOrder.objects.get(
                                                    assay=self.assay,
                                                    solr_field='Cell Line')
        new_rank = 5
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

    def test_update_attribute_order_ranks_invalid(self):
        # Test invalid cases
        old_attribute_list = AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(
                                                    assay=self.assay,
                                                    solr_field='Cell Line')
        response = update_attribute_order_ranks(attribute_order, -4)
        self.assertEqual(response, 'Invalid: rank must be integer >= 0')
        response = update_attribute_order_ranks(attribute_order, None)
        self.assertEqual(response,
                         'Invalid: rank must be a string or a number.')
        response = update_attribute_order_ranks(attribute_order,
                                                attribute_order.rank)
        self.assertEqual(response,
                         'Error: New rank == old rank')
        attribute_list = AttributeOrder.objects.filter(assay=self.assay)
        self.assertItemsEqual(old_attribute_list, attribute_list)

    def test_get_file_url_from_node_uuid_good_uuid(self):
        self.assertIn(
            "test_file_a.txt",
            get_file_url_from_node_uuid(self.node_a.uuid),
        )

    def test_get_file_url_from_node_uuid_bad_uuid(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid("coffee")
            self.assertEqual(
                "Couldn't fetch Node by UUID from: coffee",
                context.exception.message
            )

    def test_get_file_url_from_node_uuid_node_with_no_file(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid(self.node_b.uuid)
            self.assertEqual(
                "Node with uuid: {} has no associated file url".format(
                    self.node_b.uuid
                ),
                context.exception.message
            )


class NodeClassMethodTests(TestCase):
    def setUp(self):
        self.filestore_item = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bam',
                'Coffee is delicious!')
        )
        self.filestore_item_1 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.bed',
                'Coffee is delicious!')
        )
        self.filestore_item_2 = FileStoreItem.objects.create(
            datafile=SimpleUploadedFile(
                'test_file.seg',
                'Coffee is delicious!')
        )
        self.dataset = DataSet.objects.create()
        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()
        self.investigation_link = InvestigationLink.objects.create(
            investigation=self.investigation,
            data_set=self.dataset)

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        # Create Nodes
        self.node = Node.objects.create(assay=self.assay, study=self.study)
        self.another_node = Node.objects.create(assay=self.assay,
                                                study=self.study)
        self.file_node = Node.objects.create(
            assay=self.assay,
            study=self.study,
            file_uuid=self.filestore_item_1.uuid
        )

    # Parents and Children:

    def test_get_children(self):
        self.assertEqual(self.node.get_children(), [])
        self.node.add_child(self.another_node)
        child_uuid = self.node.get_children()[0]
        self.assertIsNotNone(child_uuid)
        self.assertEqual(child_uuid, self.another_node.uuid)

        # Check inverse relationship:
        self.assertEqual(self.node.uuid, self.another_node.get_parents()[0])

    def test_get_parents(self):
        self.assertEqual(self.another_node.get_parents(), [])
        self.node.add_child(self.another_node)
        parent_uuid = self.another_node.get_parents()[0]
        self.assertIsNotNone(parent_uuid)
        self.assertEqual(parent_uuid, self.node.uuid)

        # Check inverse relationship:
        self.assertEqual(self.another_node.uuid, self.node.get_children()[0])

    # Auxiliary nodes:

    def test_create_and_associate_auxiliary_node(self):
        self.assertEqual(self.node.get_children(), [])
        self.node._create_and_associate_auxiliary_node(
            self.filestore_item.uuid)
        self.assertIsNotNone(self.node.get_children())
        self.assertIsNotNone(Node.objects.get(
            file_uuid=self.filestore_item.uuid))
        self.assertEqual(self.node.get_children()[0], Node.objects.get(
            file_uuid=self.filestore_item.uuid).uuid)
        self.assertEqual(Node.objects.get(
            file_uuid=self.filestore_item.uuid).get_parents()[0],
                         self.node.uuid)
        self.assertEqual(Node.objects.get(uuid=self.node.get_children()[
            0]).is_auxiliary_node, True)

    def test_get_auxiliary_nodes(self):
        self.assertEqual(self.node.get_children(), [])

        for i in xrange(2):
            self.node._create_and_associate_auxiliary_node(
                self.filestore_item.uuid)
            self.assertEqual(len(self.node.get_children()), 1)
            # Still just one child even on second time.
            self.assertEqual(Node.objects.get(
                file_uuid=self.filestore_item.uuid
            ).get_relative_file_store_item_url(),
                 FileStoreItem.objects.get(
                     uuid=Node.objects.get(
                         file_uuid=self.filestore_item.uuid).file_uuid
                 ).get_datafile_url())

    def test_get_auxiliary_file_generation_task_state(self):
        # Normal nodes will always return None
        self.assertIsNone(self.node.get_auxiliary_file_generation_task_state())

        # Auxiliary nodes will have a task state
        self.node._create_and_associate_auxiliary_node(
            self.filestore_item.uuid)
        auxiliary = Node.objects.get(uuid=self.node.get_children()[0])
        state = auxiliary.get_auxiliary_file_generation_task_state()
        self.assertIn(state, ['PENDING', 'STARTING', 'SUCCESS'])
        # Values from:
        # http://docs.celeryproject.org/en/latest/_modules/celery/result.html#AsyncResult

    # File store:

    def test_get_file_store_item(self):
        self.assertEqual(self.file_node.get_file_store_item(),
                         self.filestore_item_1)
        self.assertEqual(self.node.get_file_store_item(),
                         None)

    def test_get_relative_file_store_item_url(self):
        relative_url = self.file_node.get_relative_file_store_item_url()
        self.assertEqual(relative_url, self.file_node.get_file_store_item(
        ).get_datafile_url())


class NodeApiV2Tests(APITestCase):

    def setUp(self):
        self.public_group_name = ExtendedGroup.objects.public_group().name
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '',
                                             self.password)

        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.view = NodeViewSet.as_view({'get': 'list'})

        self.url_root = '/api/v2/node/'

        # Create Investigation/InvestigationLinks for the DataSets
        self.investigation = Investigation.objects.create()

        # Create Studys and Assays
        self.study = Study.objects.create(investigation=self.investigation)
        self.assay = Assay.objects.create(study=self.study)

        # Create Nodes
        self.node = Node.objects.create(assay=self.assay, study=self.study)

        self.node_json = json.dumps([{
            "uuid": "cfb31cca-4f58-4ef0-b1e2-4469c804bf73",
            "relative_file_store_item_url": None,
            "parent_nodes": [],
            "child_nodes": [
                "1d9ee2ee-d804-4458-93b9-b1fb9a08a2c8"
            ],
            "auxiliary_nodes": [],
            "is_auxiliary_node": False,
            "file_extension": None,
            "auxiliary_file_generation_task_state": None,
            "ready_for_igv_detail_view": None
        }])

        self.client.login(username=self.username, password=self.password)

        # Make a reusable request & response
        self.get_request = self.factory.get(self.url_root)
        self.get_response = self.view(self.get_request)
        self.put_request = self.factory.put(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.put_response = self.view(self.put_request)
        self.patch_request = self.factory.patch(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.patch_response = self.view(self.patch_request)
        self.options_request = self.factory.options(
            self.url_root,
            data=self.node_json,
            format="json"
        )
        self.options_response = self.view(self.options_request)

    def test_get_request(self):
        self.assertIsNotNone(self.get_response.data[0])

    def test_get_request_anonymous_user(self):
        self.client.logout()
        self.new_get_request = self.factory.get(self.url_root)
        self.new_get_response = self.view(self.new_get_request)
        self.assertIsNotNone(self.new_get_response.data[0])
        self.assertEqual(self.new_get_request.user.id, None)

    def test_unallowed_http_verbs(self):
        self.assertEqual(
            self.put_response.data['detail'], 'Method "PUT" not allowed.')
        self.assertEqual(
            self.patch_response.data['detail'], 'Method "PATCH" not allowed.')
        self.assertEqual(
            self.options_response.data['detail'],
            'Method "OPTIONS" not allowed.')

    def test_get_children(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['child_nodes'], [])

    def test_get_parents(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['parent_nodes'], [])

    def test_get_aux_nodes(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(self.get_response.data[0]['auxiliary_nodes'], [])

    def test_get_aux_node_task_states(self):
        self.assertIsNotNone(self.get_response.data)
        self.assertEqual(
            self.get_response.data[0]['auxiliary_file_generation_task_state'],
            None
        )

    def test_get_file_extension(self):
        self.assertEqual(self.get_response.data[0]['file_extension'], None)

    def test_get_relative_file_store_item_url(self):
        self.assertEqual(
            self.get_response.data[0]['relative_file_store_item_url'],
            None
        )

    def test_get_basic_node(self):
        self.assertRegexpMatches(
            self.get_response.data[0]['uuid'],
            re.compile(
                '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            )
        )

        # Assert that the meaningful response fields from Node api v1 are a
        # subset of the response from Node api v2
        # NOTE: Once we move away from a reliance on Node api v1 some of the
        # tests below can most likely be removed

        self.assertTrue('analysis_uuid' in self.get_response.data[0])
        self.assertTrue('assay' in self.get_response.data[0])
        self.assertTrue('file_uuid' in self.get_response.data[0])
        self.assertTrue('name' in self.get_response.data[0])
        self.assertTrue('study' in self.get_response.data[0])
        self.assertTrue('subanalysis' in self.get_response.data[0])
        self.assertTrue('type' in self.get_response.data[0])
        self.assertTrue('uuid' in self.get_response.data[0])


class NodeIndexTests(APITestCase):

    def setUp(self):
        investigation = Investigation.objects.create()
        study = Study.objects.create(investigation=investigation)
        assay = Assay.objects.create(study=study)

        test_file = StringIO()
        test_file.write('Coffee is great.\n')
        file_store_item = FileStoreItem.objects.create(
            datafile=InMemoryUploadedFile(
                test_file,
                field_name='tempfile',
                name='test_file.txt',
                content_type='text/plain',
                size=len(test_file.getvalue()),
                charset='utf-8'
            )
        )

        self.node = Node.objects.create(
            assay=assay,
            study=study,
            file_uuid=file_store_item.uuid)

        self.assay_uuid = assay.uuid
        self.study_uuid = study.uuid
        self.file_uuid = file_store_item.uuid
        self.node_uuid = self.node.uuid

        Attribute.objects.create(
            node=self.node,
            type=Attribute.CHARACTERISTICS,
            subtype='fake subtype',
            value='fake value'
        )

        self.maxDiff = None

    def tearDown(self):
        FileStoreItem.objects.all().delete()

    def test_prepare(self):
        data = NodeIndex().prepare(self.node)
        data = dict(
            (
                re.sub(r'\d+', '#', k),
                re.sub(r'\d+', '#', v) if
                type(v) in (unicode, str) and not('uuid' in k)
                else v
            )
            for (k, v) in data.items())
        self.assertEqual(data,
                         {'REFINERY_ANALYSIS_UUID_#_#_s': 'N/A',
                          'REFINERY_FILETYPE_#_#_s': None,
                          'REFINERY_NAME_#_#_s': u'',
                          'REFINERY_SUBANALYSIS_#_#_s': -1,
                          'REFINERY_TYPE_#_#_s': u'',
                          'REFINERY_WORKFLOW_OUTPUT_#_#_s': 'N/A',
                          'analysis_uuid': None,
                          'assay_uuid': self.assay_uuid,
                          u'django_ct': u'data_set_manager.node',
                          u'django_id': u'#',
                          'file_uuid': self.file_uuid,
                          'genome_build': None,
                          u'id': u'data_set_manager.node.#',
                          'is_annotation': False,
                          'name': u'',
                          'species': None,
                          'study_uuid': self.study_uuid,
                          'subanalysis': None,
                          'text': u'',
                          'type': u'',
                          'uuid': self.node_uuid,
                          'workflow_output': None})


class AnnotatedNodeExplosionTestCase(TestCase):
    def setUp(self):
        self.username = 'coffee_lover'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(
            self.username,
            '',
            self.password
        )

    def test_metabolights_isatab_wont_import_with_rollback_a(self):
        parse_isatab(
            self.user.username,
            True,
            "refinery/data_set_manager/test-data/MTBLS1.zip"
        )
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)

    def test_metabolights_isatab_wont_import_with_rollback_b(self):
        parse_isatab(
            self.user.username,
            True,
            "refinery/data_set_manager/test-data/MTBLS112.zip"
        )
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)
