from io import StringIO
import logging
import json
import uuid

from django.contrib.auth.models import User
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db.models import Q
from django.http import QueryDict
from django.test import TestCase

from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_mock_hg_19_data_set,
                               create_mock_isatab_9909_data_set)
import mock

import constants
from core.models import DataSet, InvestigationLink
from file_store.models import FileStoreItem

from .models import (AnnotatedNode, Assay, AttributeOrder, Investigation, Node,
                     Study)
from .serializers import AttributeOrderSerializer
from .utils import (_create_solr_params_from_node_uuids,
                    create_facet_field_counts, create_facet_filter_query,
                    cull_attributes_from_list, customize_attribute_response,
                    escape_character_solr, format_solr_response,
                    generate_filtered_facet_fields,
                    generate_solr_params_for_assay,
                    get_file_url_from_node_uuid, get_owner_from_assay,
                    get_first_annotated_node_from_solr_name,
                    hide_fields_from_list, initialize_attribute_order_ranks,
                    is_field_in_hidden_list, update_annotated_nodes,
                    update_attribute_order_ranks)

TEST_DATA_BASE_PATH = "data_set_manager/test-data/"

logger = logging.getLogger(__name__)


class UtilitiesTests(TestCase):

    def setUp(self):
        self.user1 = User.objects.create_user("ownerJane", '', 'test1234')
        self.user1.save()
        investigation = Investigation.objects.create()
        data_set = DataSet.objects.create(title="Test DataSet")
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
        self.node_a = Node.objects.create(name='n0', assay=self.assay,
                                          study=self.study,
                                          file_item=file_store_item_a)
        self.node_b = Node.objects.create(name='n1', assay=self.assay,
                                          study=self.study)

        self.hg_19_data_set = create_mock_hg_19_data_set(user=self.user1)
        self.isatab_9909_data_set = create_mock_isatab_9909_data_set(
            user=self.user1
        )

    def tearDown(self):
        # Trigger the pre_delete signal so that datafiles are purged
        FileStoreItem.objects.all().delete()

    def test_create_facet_field_counts(self):
        facet_field_array = {
            'WORKFLOW': {'buckets': [
                {'val': '1_test_04', 'count': 1},
                {'val': 'output_file', 'count': 60},
                {'val': '1_test_02', 'count': 1}
            ]},
            'ANALYSIS': {'buckets': [
                {'val': '5dd6d3c3', 'count': 5},
                {'val': '08fc3964', 'count': 2},
                {'val': '0907a312', 'count': 1},
                {'val': '276adefd', 'count': 3}
            ]},
            'Author': {"buckets": [
                {'val': 'Vezza', 'count': 10},
                {'val': 'Harslem/Heafner', 'count': 4},
                {'val': 'McConnell', 'count': 5},
                {'val': 'Vezza + Crocker', 'count': 2},
                {'val': 'Crocker', 'count': 28}
            ]},
            'Year': {"buckets": [{'val': '1971', 'count': 54}]},
            'SUBANALYSIS': {"buckets": [
                {'val': '1', 'count': 8},
                {'val': '2', 'count': 2},
                {'val': '-1', 'count': 9}
            ]},
            'TYPE': {"buckets": [
                {'val': 'Derived Data File', 'count': 105},
                {'val': 'Raw Data File', 'count': 9}
            ]}
        }

        facet_field_obj = create_facet_field_counts(facet_field_array)
        self.assertDictEqual(facet_field_obj,
                             {'WORKFLOW': [
                                 {'name': 'output_file', 'count': 60},
                                 {'name': '1_test_04', 'count': 1},
                                 {'name': '1_test_02', 'count': 1}
                             ],
                              'ANALYSIS': [
                                  {'name': '5dd6d3c3', 'count': 5},
                                  {'name': '276adefd', 'count': 3},
                                  {'name': '08fc3964', 'count': 2},
                                  {'name': '0907a312', 'count': 1}
                              ],
                              'Author': [
                                  {'name': 'Crocker', 'count': 28},
                                  {'name': 'Vezza', 'count': 10},
                                  {'name': 'McConnell', 'count': 5},
                                  {'name': 'Harslem/Heafner', 'count': 4},
                                  {'name': 'Vezza + Crocker', 'count': 2}
                              ],
                              'Year': [{'name': '1971', 'count': 54}],
                              'SUBANALYSIS': [
                                  {'name': '-1', 'count': 9},
                                  {'name': '1', 'count': 8},
                                  {'name': '2', 'count': 2}
                              ],
                              'TYPE': [
                                  {'name': 'Derived Data File', 'count': 105},
                                  {'name': 'Raw Data File', 'count': 9}
                              ]})

    def test_escape_character_solr(self):
        field = "(mouse){index}[dog]^~*?:;/ +-&|"
        expected_response = "\\(mouse\\)\\{index\\}\\[" \
                            "dog\\]\\^\\~\\*\\?\\:\\;\\/\\ \\+\\-\\&\\|"
        response = escape_character_solr(field)
        self.assertEqual(response, expected_response)
        response = escape_character_solr("")
        self.assertEqual(response, "")

    def test_create_facet_filter_query(self):
        facet_filter = {'Author': ['Vezza', 'McConnell'],
                        'TYPE': ['Raw Data File']}
        true_facet_query = ['{!tag=AUTHOR}Author:(Vezza OR McConnell)',
                            '{!tag=TYPE}TYPE:(Raw\\ Data\\ File)',]
        facet_field_query = create_facet_filter_query(facet_filter)
        self.assertEqual(set(facet_field_query),
                         set(true_facet_query))

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
        self.assertListEqual(filtered_list, [{'solr_field': 'uuid'},
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

    def test_generate_solr_params_no_params_returns_obj(self):
        # empty params
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertCountEqual(sorted(query.keys()), ['json', 'params'])

    def test_generate_solr_params_no_params_returns_params(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertCountEqual(query['params'],
                              {
                                  'facet.limit': '-1',
                                  'fq': 'is_annotation:false',
                                  'rows': constants.REFINERY_SOLR_DOC_LIMIT,
                                  'start': '0',
                                  'wt': 'json'
                              })

    def test_generate_solr_params_no_params_returns_json_facet(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertCountEqual(list(query['json']['facet'].keys()),
                              ['Analysis', 'Cell Line', 'Cell Type',
                               'Group Name', 'Organism', 'Type'])

    def test_generate_solr_params_no_params_returns_json_fields(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertCountEqual(query['json']['fields'],
                              ['Analysis', 'Cell Line', 'Cell Type',
                               'Character_Title', 'Group Name', 'Organism',
                               'REFINERY_DATAFILE_s', 'Specimen', 'Type'])

    def test_generate_solr_params_no_params_returns_json_filter(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertListEqual(query['json']['filter'],
                             ['assay_uuid:({})'.format(self.valid_uuid)])

    def test_generate_solr_params_no_params_returns_json_query(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertEqual(query['json']['query'],
                         'django_ct:data_set_manager.node')

    def test_generate_solr_params_for_assay_with_params_return_obj(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertCountEqual(list(query.keys()), ['json', 'params'])

    def test_generate_solr_params_for_assay_with_params_returns_params(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertCountEqual(query['params'],
                              {
                                  'facet.limit': '-1',
                                  'fq': 'is_annotation:false',
                                  'rows': constants.REFINERY_SOLR_DOC_LIMIT,
                                  'start': '0',
                                  'wt': 'json'
                              })

    def test_generate_solr_params_params_returns_json_facet(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertCountEqual(list(query['json']['facet'].keys()),
                              ['cats', 'dog', 'horse', 'mouse'])

    def test_generate_solr_params_params_returns_json_fields(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertListEqual(query['json']['fields'],
                             ['cats', 'mouse', 'dog', 'horse'])

    def test_generate_solr_params_params_returns_json_filter(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertListEqual(query['json']['filter'],
                             ['assay_uuid:({})'.format(self.valid_uuid)])

    def test_generate_solr_params_params_returns_json_query(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertEqual(query['json']['query'],
                         'django_ct:data_set_manager.node')

    def test_cull_attributes_from_list(self):
        new_attribute_list = cull_attributes_from_list(
           self.new_attribute_order_array,
           [self.new_attribute_order_array[0].get('solr_field'),
            self.new_attribute_order_array[1].get('solr_field'),
            self.new_attribute_order_array[2].get('solr_field')]
        )
        self.assertDictEqual(new_attribute_list[0],
                             self.new_attribute_order_array[3])

    def test_cull_attributes_from_list_with_empty_list_returns_list(self):
        new_attribute_list = cull_attributes_from_list(
            self.new_attribute_order_array, []
        )
        self.assertDictEqual(new_attribute_list[0],
                             self.new_attribute_order_array[0])
        self.assertEqual(len(new_attribute_list),
                         len(self.new_attribute_order_array))

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
                                        ['REFINERY_DATAFILE_s',
                                         'Character_Title', 'Specimen',
                                         'Cell Type', 'Analysis',
                                         'Organism', 'Cell Line',
                                         'Type', 'Group Name']})

    def generate_filtered_facet_fields(self):
        facet_field_string = ['REFINERY_SUBANALYSIS_6_3_s',
                              'REFINERY_WORKFLOW_OUTPUT_6_3_s',
                              'REFINERY_ANALYSIS_UUID_6_3_s',
                              'Author_Characteristics_6_3_s',
                              'Year_Characteristics_6_3_s']
        query_dict = generate_filtered_facet_fields(facet_field_string)
        self.assertEqual(query_dict.get('facet_field'), facet_field_string)
        self.assertEqual(query_dict.get('field_limit'), facet_field_string)

    def test_get_owner_from_valid_assay(self):
        owner = get_owner_from_assay(self.valid_uuid).username
        # valid owner with valid uuid
        self.assertEqual(str(owner), 'ownerJane')

    def test_get_owner_from_invalid_assay(self):
        # invalid uuid
        response = get_owner_from_assay(self.invalid_uuid)
        self.assertEqual(response, None)

    def test_format_solr_response_valid(self):
        # valid input, expected response from solr
        solr_response = json.dumps({
            "responseHeader": {
                "status": 0,
                "QTime": 137,
                "params": {
                    "json": '{"facet": '
                            '{"REFINERY_SUBANALYSIS_16_82_s": {'
                            '"field": "REFINERY_SUBANALYSIS_16_82_s", '
                            '"type": "terms", "mincount": 0}, '
                            '"REFINERY_WORKFLOW_OUTPUT_16_82_s": {'
                            '"field": "REFINERY_WORKFLOW_OUTPUT_16_82_s", '
                            '"type": "terms", "mincount": 0}, '
                            '"organism_Characteristics_16_82_s": '
                            '{"field": "organism_Characteristics_16_82_s", '
                            '"type": "terms", "mincount": 0},'
                            '"REFINERY_TYPE_16_82_s": {'
                            '"field": "REFINERY_TYPE_16_82_s", '
                            '"type": "terms", "mincount": 0}}, '
                            '"query": "django_ct:data_set_manager.node", '
                            '"filter": ["assay_uuid:('
                            '16cfd7ab-4bf7-4951-baf3-de270a12b225)"],'
                            '"fields": ['
                            '"REFINERY_SUBANALYSIS_16_82_s", '
                            '"REFINERY_WORKFLOW_OUTPUT_16_82_s", '
                            '"organism_Characteristics_16_82_s", '
                            '"REFINERY_TYPE_16_82_s"]}',
                    "start": "0",
                    "facet.limit": "-1",
                    "wt": "json",
                    "fq": "is_annotation:false",
                    "rows": "100"
                }
            },
            "response": {
               "numFound": 1,
               "start": 0,
               "docs": [
                   {"REFINERY_SUBANALYSIS_16_82_s": "-1",
                    "organism_Characteristics_16_82_s": "Danio",
                    "REFINERY_TYPE_16_82_s": "Array Data File",
                    "REFINERY_WORKFLOW_OUTPUT_16_82_s": "N/A"
                    }]
            },
            "facets": {
               "count": 1,
               "REFINERY_SUBANALYSIS_16_82_s": {
                   "buckets": [{"val": "-1", "count": 16}]
               },
               "REFINERY_WORKFLOW_OUTPUT_16_82_s": {
                   "buckets": [{"val": "N/A", "count": 16}]
               },
               "organism_Characteristics_16_82_s": {
                   "buckets": [{"val": "Danio", "count": 16}]
               },
               "REFINERY_TYPE_16_82_s": {
                   "buckets": [
                       {"val": "Array Data File", "count": 14},
                       {"val": "Derived Array Data File", "count": 2}]
               }
            }
        })

        formatted_response = format_solr_response(solr_response)
        self.assertDictEqual(
            formatted_response,
            {
                'facet_field_counts': {
                    'REFINERY_SUBANALYSIS_16_82_s': [
                        {'name': '-1', 'count': 16}
                    ],
                    'REFINERY_TYPE_16_82_s': [
                        {'name': 'Array Data File', 'count': 14},
                        {'name': 'Derived Array Data File', 'count': 2}
                    ],
                    'REFINERY_WORKFLOW_OUTPUT_16_82_s': [
                        {'name': 'N/A', 'count': 16}
                    ],
                    'organism_Characteristics_16_82_s': [
                        {'name': 'Danio', 'count': 16}
                    ]
                },
                'attributes': [
                    {
                        'attribute_type': 'Internal',
                        'display_name': 'Analysis Group',
                        'file_ext': 's',
                        'internal_name': 'REFINERY_SUBANALYSIS_16_82_s'
                    },
                    {
                        'attribute_type': 'Internal',
                        'display_name': 'Output Type',
                        'file_ext': 's',
                        'internal_name': 'REFINERY_WORKFLOW_OUTPUT_16_82_s'
                    },
                    {
                        'attribute_type': 'Characteristics',
                        'display_name': 'Organism',
                        'file_ext': 's',
                        'internal_name': 'organism_Characteristics_16_82_s'
                    },
                    {
                        'attribute_type': 'Internal',
                        'display_name': 'Type',
                        'file_ext': 's',
                        'internal_name': 'REFINERY_TYPE_16_82_s'
                    }
                ],
                'nodes_count': 1,
                'nodes': [
                    {
                        'REFINERY_WORKFLOW_OUTPUT_16_82_s': 'N/A',
                        'organism_Characteristics_16_82_s': 'Danio',
                        'REFINERY_SUBANALYSIS_16_82_s': '-1',
                        'REFINERY_TYPE_16_82_s': 'Array Data File'
                    }
                ]
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
            assay=self.new_assay
        )
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
            assay=self.new_assay
        )
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
            assay=self.new_assay
        )
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
            assay=self.assay, solr_field='Character_Title'
        )
        new_rank = 5
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(assay=self.assay)
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
            assay=self.assay, solr_field='Character_Title'
        )
        new_rank = 10
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay
        )
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
            assay=self.assay, solr_field='Character_Title'
        )
        new_rank = 1
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay
        )
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
        attribute_order = AttributeOrder.objects.get(
            assay=self.assay, solr_field='Character_Title'
        )
        new_rank = 0
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(
                assay=self.assay
        )
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
        attribute_order = AttributeOrder.objects.get(
            assay=self.assay, solr_field='Character_Title'
        )
        new_rank = 7
        update_attribute_order_ranks(attribute_order, new_rank)
        AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(assay=self.assay,
                                                     solr_field='Type')
        new_rank = 9
        update_attribute_order_ranks(attribute_order, new_rank)
        AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(assay=self.assay,
                                                     solr_field='Name')
        new_rank = 3
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(assay=self.assay)
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
        attribute_order = AttributeOrder.objects.get(assay=self.assay,
                                                     solr_field='Cell Line')
        new_rank = 5
        update_attribute_order_ranks(attribute_order, new_rank)
        attribute_list = AttributeOrder.objects.filter(assay=self.assay)
        for attribute in attribute_list:
            self.assertEqual(attribute.rank,
                             expected_order[attribute.solr_field])

    def test_update_attribute_order_ranks_invalid(self):
        # Test invalid cases
        old_attribute_list = AttributeOrder.objects.filter(assay=self.assay)
        attribute_order = AttributeOrder.objects.get(assay=self.assay,
                                                     solr_field='Cell Line')
        response = update_attribute_order_ranks(attribute_order, -4)
        self.assertEqual(response, 'Invalid: rank must be integer >= 0')
        response = update_attribute_order_ranks(attribute_order, None)
        self.assertEqual(response,
                         'Invalid: rank must be a string or a number.')
        response = update_attribute_order_ranks(attribute_order,
                                                attribute_order.rank)
        self.assertEqual(response, 'Error: New rank == old rank')
        attribute_list = AttributeOrder.objects.filter(assay=self.assay)
        self.assertCountEqual(old_attribute_list, attribute_list)

    @mock.patch("data_set_manager.utils.core.utils.build_absolute_url")
    def test_get_file_url_from_node_uuid_good_uuid(self, mock_get_url):
        mock_get_url.return_value = "test_file_a.txt"
        self.assertIn('test_file_a.txt',
                      get_file_url_from_node_uuid(self.node_a.uuid)
                      )

    def test_get_file_url_from_node_uuid_bad_uuid(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid("coffee")
            self.assertEqual("Couldn't fetch Node by UUID from: coffee",
                             str(context.exception)
                             )

    def test_get_file_url_from_node_uuid_with_no_file(self):
        self.assertIsNone(get_file_url_from_node_uuid(self.node_b.uuid))

    def test_get_file_url_from_node_uuid_with_no_file_url_required(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid(self.node_b.uuid,
                                        require_valid_url=True)
        self.assertIn("has no associated file url", str(context.exception))

    def test__create_solr_params_from_node_uuids(self):
        fake_node_uuids = [str(uuid.uuid4()), str(uuid.uuid4())]
        node_solr_params = _create_solr_params_from_node_uuids(fake_node_uuids)
        self.assertEqual(
            node_solr_params,
            {
                "json": {
                    "query": "django_ct:data_set_manager.node",
                    "filter": "uuid:({})".format(" OR ".join(fake_node_uuids))
                },
                "params": {
                    "wt": "json",
                    "rows": constants.REFINERY_SOLR_DOC_LIMIT
                }
            }
        )

    def test_update_annotated_nodes(self):
        type = 'Raw Data File'
        nodes_before = AnnotatedNode.objects.filter(
            Q(study__uuid=self.study.uuid, assay__uuid=self.assay.uuid,
                node_type=type)
        )
        self.assertEqual(len(nodes_before), 0)

        update_annotated_nodes(type, study_uuid=self.study.uuid,
                               assay_uuid=self.assay.uuid, update=True)

        nodes_after = AnnotatedNode.objects.filter(
            Q(study__uuid=self.study.uuid, assay__uuid=self.assay.uuid,
              node_type=type)
        )
        self.assertEqual(len(nodes_after), 0)
        # TODO: Is this the behavior we expect?

    def test_update_existing_dataset_with_revised_investigation(self):
        existing_data_set = create_dataset_with_necessary_models()
        new_data_set = create_dataset_with_necessary_models()
        existing_data_set.update_with_revised_investigation(
            new_data_set.get_investigation()
        )
        self.assertEqual(existing_data_set.get_investigation(),
                         new_data_set.get_investigation())

    def test_update_existing_data_set_with_revised_investigation_new_version(
        self
    ):
        existing_data_set = create_dataset_with_necessary_models()
        new_data_set = create_dataset_with_necessary_models()
        existing_data_set.update_with_revised_investigation(
            new_data_set.get_investigation()
        )
        self.assertEqual(existing_data_set.get_version(), 2)

    def test_update_existing_data_set_with_revised_investigation_new_message(
        self
    ):
        existing_data_set = create_dataset_with_necessary_models()
        new_data_set = create_dataset_with_necessary_models()
        existing_data_set.update_with_revised_investigation(
            new_data_set.get_investigation()
        )
        self.assertEqual(
            existing_data_set.get_latest_investigation_link().message,
            "Metadata Revision: for {}".format(
                new_data_set.get_investigation().title
            )
        )

    def test_get_first_annotated_node_from_solr_name_characteristic(self):
        node = self.hg_19_data_set.get_nodes().filter(
            type=Node.RAW_DATA_FILE
        )[0]
        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='organism'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        first_node = get_first_annotated_node_from_solr_name(solr_name, node)
        self.assertEqual(annotated_node, first_node)

    def test_get_first_annotated_node_from_solr_name_label(self):
        nodes = self.isatab_9909_data_set.get_nodes()
        node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype=None, attribute_type='Label'
        )[0]
        solr_name = '{}_652_326_s'.format(annotated_node.attribute_type)
        first_node = get_first_annotated_node_from_solr_name(solr_name, node)
        self.assertEqual(annotated_node, first_node)

    def test_get_first_annotated_node_from_solr_name_material_type(self):
        nodes = self.isatab_9909_data_set.get_nodes()
        node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype=None, attribute_type='Material Type'
        )[0]
        solr_name = '{}_652_326_s'.format('Material_Type')
        first_node = get_first_annotated_node_from_solr_name(solr_name, node)
        self.assertEqual(annotated_node, first_node)

    def test_get_first_annotated_node_from_solr_name_factor(self):
        nodes = self.isatab_9909_data_set.get_nodes()
        node = nodes.filter(
            type=Node.ARRAY_DATA_FILE,
            name='http://test.site/sites/bioassay_files/ks020802HU133A1a.CEL'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='culture medium',
            attribute_type='Factor Value'
        )[0]
        solr_name = '{}_Factor_Value_652_326_s'.format(
            annotated_node.attribute_subtype
        )
        first_node = get_first_annotated_node_from_solr_name(solr_name, node)
        self.assertEqual(annotated_node, first_node)

    def test_get_first_annotated_node_from_solr_name_comment(self):
        nodes = self.isatab_9909_data_set.get_nodes()
        node = nodes.filter(
            type=Node.DERIVED_ARRAY_DATA_MATRIX_FILE,
            name='http://test.site/sites/9909.GPL96_pluriconsensus.pdf'
        )[0]

        annotated_node = AnnotatedNode.objects.filter(
            node=node, attribute_subtype='Data Record Accession',
            attribute_type='Comment'
        )[0]
        solr_name = '{}_{}_652_326_s'.format(annotated_node.attribute_subtype,
                                             annotated_node.attribute_type)
        first_node = get_first_annotated_node_from_solr_name(solr_name, node)
        self.assertEqual(annotated_node, first_node)
