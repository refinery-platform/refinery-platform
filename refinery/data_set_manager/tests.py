"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.http import QueryDict

from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase
from rest_framework.test import APIClient

from .models import AttributeOrder, Assay, Study, Investigation
from .views import Assays, AssaysAttributes
from .utils import (update_attribute_order_ranks,
                    customize_attribute_response, format_solr_response,
                    get_owner_from_assay, generate_facet_fields_query,
                    hide_fields_from_list, is_field_in_hidden_list,
                    generate_filtered_facet_fields,
                    insert_facet_field_filter, create_facet_filter_query,
                    generate_solr_params, objectify_facet_field_counts,
                    escape_character_solr)
from .serializers import AttributeOrderSerializer
from core.models import DataSet, InvestigationLink


class AssaysAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
        study = Study.objects.create(
                file_name='test_filename123.txt',
                title='Study Title Test',
                investigation=investigation)
        self.assay = {
            'study': study,
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
        self.assay['study'] = study.id
        self.valid_uuid = assay.uuid
        self.url_root = '/api/v2/assays/'
        self.view = Assays.as_view()
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def tearDown(self):
        Assay.objects.all().delete()
        Study.objects.all().delete()
        Investigation.objects.all().delete()

    def test_get_valid(self):
        # valid_uuid
        request = self.factory.get('%s/%s/' % (self.url_root, self.valid_uuid))
        response = self.view(request, self.valid_uuid)
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(response.data.keys(), self.assay.keys())
        self.assertItemsEqual(response.data.values(), self.assay.values())

    def test_get_invalid(self):
        # invalid_uuid
        request = self.factory.get('%s/%s/' % (self.url_root,
                                               self.invalid_uuid))
        response = self.view(request, self.invalid_uuid)
        self.assertEqual(response.status_code, 404)

    def test_get_invalid_format(self):
        # invalid_format_uuid
        request = self.factory.get('%s/%s/'
                                   % (self.url_root, self.invalid_format_uuid))
        response = self.view(request, self.invalid_format_uuid)
        self.assertEqual(response.status_code, 404)


# class AssaysFilesAPITests(APITestCase):
#
#     def setUp(self):
#
#         self.factory = APIRequestFactory()
#         investigation = Investigation.objects.create()
#         study = Study.objects.create(file_name='test_filename123.txt',
#                                      title='Study Title Test',
#                                      investigation=investigation)
#
#         assay = Assay.objects.create(
#                 study=study,
#                 measurement='transcription factor binding site',
#                 measurement_accession='http://www.testurl.org/testID',
#                 measurement_source='OBI',
#                 technology='nucleotide sequencing',
#                 technology_accession='test info',
#                 technology_source='test source',
#                 platform='Genome Analyzer II',
#                 file_name='test_assay_filename.txt',
#                 )
#         self.valid_uuid = assay.uuid
#         self.view = AssaysFiles.as_view()
#         self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
#         self.invalid_format_uuid = "xxxxxxxx"
#
#     def tearDown(self):
#         Assay.objects.all().delete()
#         Study.objects.all().delete()
#         Investigation.objects.all().delete()
#
#     def test_get(self):
#         # valid_uuid, patch date in the module that uses it
#         with patch(
# 'data_set_manager.views.AssaysFiles.get') as mock_search_solr:
#             mock_search_solr.search_solr = {
#                 "facet_field_counts": {},
#                 "attributes": 'cow',
#                 "nodes": []}
#
#         uuid = self.valid_uuid
#         request = self.factory.get('/api/v2/assays/%s/files' % uuid)
#         response = self.view(request, uuid)
#         response.render()
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.content,
#                          '{"facet_field_counts":{},'
#                          '"attributes":"cow",'
#                          '"nodes":[]}')
#
#         # invalid_uuid
#         uuid = self.invalid_uuid
#         request = self.factory.get('/api/v2/assays/%s/files' % uuid)
#         response = self.view(request, uuid)
#         response.render()
#         self.assertEqual(response.status_code, 200)
#         self.assertEqual(response.content,
#                          '{"facet_field_counts":{},'
#                          '"attributes":cow,'
#                          '"nodes":[]}')


class AssaysAttributesAPITests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user("ownerJane", '', 'test1234')
        self.user2 = User.objects.create_user("guestName", '', 'test1234')
        self.user1.save()
        self.user2.save()
        self.factory = APIRequestFactory()
        self.client = APIClient()
        self.client.login(username='ownerJane', password='test1234')
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
        self.client.logout()

    def tearDown(self):
        User.objects.all().delete()
        Assay.objects.all().delete()
        Study.objects.all().delete()
        Investigation.objects.all().delete()
        DataSet.objects.all().delete()
        AttributeOrder.objects.all().delete()

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
        study = Study.objects.create(file_name='test_filename123.txt',
                                     title='Study Title Test',
                                     investigation=investigation)
        self.assay = Assay.objects.create(
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

        self.attribute_order_array = [{
            'study': study,
            'assay': self.assay,
            'solr_field': 'Character_Title',
            'rank': 1,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False,
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Specimen',
            'rank': 2,
            'is_exposed': True,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Cell Type',
            'rank': 3,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Analysis',
            'rank': 4,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Organism',
            'rank': 5,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Cell Line',
            'rank': 6,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Type',
            'rank': 7,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Group Name',
            'rank': 8,
            'is_exposed': True,
            'is_facet': True,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Gene',
            'rank': 9,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Replicate Id',
            'rank': 10,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
            'assay': self.assay,
            'solr_field': 'Organism Part',
            'rank': 0,
            'is_exposed': False,
            'is_facet': False,
            'is_active': True,
            'is_internal': False
        }, {
            'study': study,
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

        self.url_root = '/api/v2/assays'
        self.valid_uuid = self.assay.uuid
        self.invalid_uuid = 'xxxxxxxx'

    def tearDown(self):
        User.objects.all().delete()
        Assay.objects.all().delete()
        Study.objects.all().delete()
        Investigation.objects.all().delete()
        DataSet.objects.all().delete()
        InvestigationLink.objects.all().delete()
        AttributeOrder.objects.all().delete()

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

    def test_generate_solr_params(self):
        # empty params
        query = generate_solr_params(QueryDict({}), self.valid_uuid)
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A{}'
                         '&facet.field=Cell Type&'
                         'facet.field=Analysis&facet.field=Organism&'
                         'facet.field=Cell Line&facet.field=Type&'
                         'facet.field=Group Name&fl=Character_Title%2C'
                         'Specimen%2CCell Type%2CAnalysis%2COrganism%2C'
                         'Cell Line%2CType%2CGroup Name&'
                         'fq=type%3A%28%22Raw Data File%22 OR %22'
                         'Derived Data File%22 OR %22Array Data File'
                         '%22 OR %22Derived Array Data File%22 OR %22'
                         'Array Data Matrix File%22 OR%22Derived Array '
                         'Data Matrix File%22%29&fq=is_annotation%3A'
                         'false&start=0&rows=20&q=django_ct%3A'
                         'data_set_manager.node&wt=json&facet=true&'
                         'facet.limit=-1'.format(
                                 self.valid_uuid))
        # added parameter
        parameter_dict = {'limit': 7, 'offset': 2,
                          'include_facet_count': 'true',
                          'attributes': 'cats,mouse,dog,horse',
                          'facets': 'cats,mouse,dog,horse',
                          'pivots': 'cats,mouse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params(parameter_qdict, self.valid_uuid)
        self.assertEqual(str(query),
                         'fq=assay_uuid%3A{}'
                         '&facet.field=cats&'
                         'facet.field=mouse&facet.field=dog&'
                         'facet.field=horse&fl=cats%2C'
                         'mouse%2Cdog%2Chorse&facet.pivot=cats%2Cmouse&'
                         'fq=type%3A%28%22Raw Data File%22 OR %22'
                         'Derived Data File%22 OR %22Array Data File'
                         '%22 OR %22Derived Array Data File%22 OR %22'
                         'Array Data Matrix File%22 OR%22Derived Array '
                         'Data Matrix File%22%29&fq=is_annotation%3A'
                         'true&start=2&rows=7&q=django_ct%3A'
                         'data_set_manager.node&wt=json&facet=true&'
                         'facet.limit=-1'.format(
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
        # invalid input, error checking
        solr_response = {"test_object": "not a string"}
        error = format_solr_response(solr_response)
        self.assertEqual(error, "Error loading json.")

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
