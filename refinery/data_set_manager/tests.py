from StringIO import StringIO
import contextlib
import logging
import json
import os
import re
import shutil
import tempfile
import uuid

from django.contrib.auth.models import User
from django.core.files.uploadedfile import (InMemoryUploadedFile,
                                            SimpleUploadedFile)
from django.core.management import call_command, CommandError
from django.db.models import Q
from django.http import QueryDict
from django.test import TestCase, override_settings

from celery.states import FAILURE, PENDING, STARTED, SUCCESS
from djcelery.models import TaskMeta

from core.utils import get_absolute_url
from factory_boy.utils import (create_dataset_with_necessary_models,
                               create_mock_hg_19_data_set,
                               create_mock_isatab_9909_data_set,
                               make_analyses_with_single_dataset)
from haystack.exceptions import SkipDocument
import mock
from override_storage import override_storage
from rest_framework.test import APITestCase

import constants
from core.models import (INPUT_CONNECTION, OUTPUT_CONNECTION, Analysis,
                         AnalysisNodeConnection, DataSet, InvestigationLink)
from core.tests import TestMigrations
from file_store.models import FileStoreItem, generate_file_source_translator
from file_store.tasks import FileImportTask

from .isa_tab_parser import IsaTabParser, ParserException
from .models import (AnnotatedNode, Assay, AttributeOrder, Investigation, Node,
                     Study)
from .search_indexes import NodeIndex
from .serializers import AttributeOrderSerializer
from .single_file_column_parser import process_metadata_table
from .tasks import parse_isatab
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
        self.node_a = Node.objects.create(name="n0", assay=self.assay,
            study=self.study, file_uuid=file_store_item_a.uuid)

        self.node_b = Node.objects.create(name="n1", assay=self.assay,
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
        facet_field_query = create_facet_filter_query(facet_filter)
        self.assertEqual(facet_field_query,
                         [u'{!tag=TYPE}TYPE:(Raw\\ Data\\ File)',
                          u'{!tag=AUTHOR}Author:(Vezza OR McConnell)'])

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
        self.assertItemsEqual(sorted(query.keys()), ['json', 'params'])

    def test_generate_solr_params_no_params_returns_params(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertItemsEqual(query['params'],
                              {
                                  'facet.limit': '-1',
                                  'fq': 'is_annotation:false',
                                  'rows': constants.REFINERY_SOLR_DOC_LIMIT,
                                  'start': '0',
                                  'wt': 'json'
                              })

    def test_generate_solr_params_no_params_returns_json_facet(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertItemsEqual(query['json']['facet'].keys(),
                             ['Analysis', 'Cell Line', 'Cell Type',
                              'Group Name', 'Organism', 'Type'])

    def test_generate_solr_params_no_params_returns_json_fields(self):
        query = generate_solr_params_for_assay(QueryDict({}), self.valid_uuid)
        self.assertItemsEqual(query['json']['fields'],
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
        self.assertItemsEqual(query.keys(), ['json', 'params'])

    def test_generate_solr_params_for_assay_with_params_returns_params(self):
        parameter_dict = {'limit': 7, 'offset': 2,
                          'facets': 'cats,mouse,dog,horse',
                          'is_annotation': 'true'}
        parameter_qdict = QueryDict('', mutable=True)
        parameter_qdict.update(parameter_dict)
        query = generate_solr_params_for_assay(parameter_qdict,
                                               self.valid_uuid)
        self.assertItemsEqual(query['params'],
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
        self.assertItemsEqual(query['json']['facet'].keys(),
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
                'facet_field_counts':
                    {u'REFINERY_SUBANALYSIS_16_82_s':
                         [{'name': u'-1', 'count': 16}],
                     u'REFINERY_TYPE_16_82_s':
                         [{'name': u'Array Data File', 'count': 14},
                          {'name': u'Derived Array Data File', 'count': 2}],
                     u'REFINERY_WORKFLOW_OUTPUT_16_82_s':
                         [{'name': u'N/A', 'count': 16}],
                     u'organism_Characteristics_16_82_s':
                         [{'name': u'Danio', 'count': 16}]
                     },
                'attributes': [
                    {'attribute_type': 'Internal',
                     'display_name': 'Analysis Group',
                     'file_ext': u's',
                     'internal_name': u'REFINERY_SUBANALYSIS_16_82_s'},
                    {'attribute_type': 'Internal',
                     'display_name': 'Output Type',
                     'file_ext': u's',
                     'internal_name': u'REFINERY_WORKFLOW_OUTPUT_16_82_s'},
                    {'attribute_type': 'Characteristics',
                     'display_name': u'Organism',
                     'file_ext': u's',
                     'internal_name': u'organism_Characteristics_16_82_s'},
                    {'attribute_type': 'Internal',
                     'display_name': u'Type',
                     'file_ext': u's',
                     'internal_name': u'REFINERY_TYPE_16_82_s'}
                ],
                'nodes_count': 1,
                'nodes': [{
                    u'REFINERY_WORKFLOW_OUTPUT_16_82_s': u'N/A',
                    u'organism_Characteristics_16_82_s': u'Danio',
                    u'REFINERY_SUBANALYSIS_16_82_s': u'-1',
                    u'REFINERY_TYPE_16_82_s': u'Array Data File'}]
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
        self.assertItemsEqual(old_attribute_list, attribute_list)

    @mock.patch("data_set_manager.utils.core.utils.get_absolute_url")
    def test_get_file_url_from_node_uuid_good_uuid(self, mock_get_url):
        mock_get_url.return_value = "test_file_a.txt"
        self.assertIn('test_file_a.txt',
                      get_file_url_from_node_uuid(self.node_a.uuid)
                      )

    def test_get_file_url_from_node_uuid_bad_uuid(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid("coffee")
            self.assertEqual("Couldn't fetch Node by UUID from: coffee",
                             context.exception.message
                             )

    def test_get_file_url_from_node_uuid_with_no_file(self):
        self.assertIsNone(get_file_url_from_node_uuid(self.node_b.uuid))

    def test_get_file_url_from_node_uuid_with_no_file_url_required(self):
        with self.assertRaises(RuntimeError) as context:
            get_file_url_from_node_uuid(self.node_b.uuid,
                                        require_valid_url=True)
        self.assertIn("has no associated file url", context.exception.message)

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


class NodeClassMethodTests(TestCase):
    def setUp(self):
        self.username = 'coffee_tester'
        self.password = 'coffeecoffee'
        self.user = User.objects.create_user(self.username, '', self.password)

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

    def test_is_orphan(self):
        self.assertTrue(self.another_node.is_orphan())
        self.node.add_child(self.another_node)
        self.assertFalse(self.another_node.is_orphan())

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
        self.assertIn(state, [PENDING, STARTED, SUCCESS])
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

    def test_get_analysis(self):
        make_analyses_with_single_dataset(1, self.user)
        analysis = Analysis.objects.all()[0]

        node_with_analysis = Node.objects.create(
            assay=self.assay,
            study=self.study,
            analysis_uuid=analysis.uuid
        )
        self.assertEqual(node_with_analysis.get_analysis(), analysis)

    def test_get_analysis_no_analysis(self):
        self.assertIsNone(self.node.get_analysis())


class NodeIndexTests(APITestCase):

    def setUp(self):
        data_set = DataSet.objects.create()
        investigation = Investigation.objects.create()
        InvestigationLink.objects.create(investigation=investigation,
                                         data_set=data_set)
        study = Study.objects.create(investigation=investigation)
        assay = Assay.objects.create(study=study, technology='whizbang')

        self.file_store_item = FileStoreItem()
        self.file_store_item.import_task_id = str(uuid.uuid4())
        self.file_store_item.save()

        self.import_task = TaskMeta.objects.create(
            task_id=self.file_store_item.import_task_id
        )

        self.node = Node.objects.create(
            assay=assay,
            study=study,
            file_uuid=self.file_store_item.uuid,
            name='http://example.com/fake.txt',
            type='Raw Data File'
        )

        self.data_set_uuid = data_set.uuid
        self.assay_uuid = assay.uuid
        self.study_uuid = study.uuid
        self.file_uuid = self.file_store_item.uuid
        self.node_uuid = self.node.uuid

        self.maxDiff = None

    def test_skip_types(self):
        self.node.type = 'Unknown File Type'
        with self.assertRaises(SkipDocument):
            NodeIndex().prepare(self.node)

    def _prepare_node_index(self, node):
        data = NodeIndex().prepare(node)
        data = dict(
            (
                re.sub(r'\d+', '#', key),
                re.sub(r'\d+', '#', value) if
                type(value) in (unicode, str) and
                key != 'REFINERY_DOWNLOAD_URL_s' and
                'uuid' not in key
                else value
            )
            for (key, value) in data.items()
        )
        return data

    def _assert_node_index_prepared_correctly(self,
                                              data_to_be_indexed,
                                              expected_download_url=None,
                                              expected_filetype=None,
                                              expected_datafile=''):
        self.assertEqual(
            data_to_be_indexed,
            {
                'REFINERY_ANALYSIS_UUID_#_#_s': 'N/A',
                'REFINERY_DATAFILE_s': expected_datafile,
                'REFINERY_DOWNLOAD_URL_s': expected_download_url,
                'REFINERY_FILETYPE_#_#_s': expected_filetype,
                'REFINERY_NAME_#_#_s': 'http://example.com/fake.txt',
                'REFINERY_SUBANALYSIS_#_#_s': -1,
                'REFINERY_TYPE_#_#_s': 'Raw Data File',
                'REFINERY_WORKFLOW_OUTPUT_#_#_s': 'N/A',
                'analysis_uuid': None,
                'assay_uuid': self.assay_uuid,
                'data_set_uuid': self.data_set_uuid,
                u'django_ct': u'data_set_manager.node',
                u'django_id': u'#',
                'file_uuid': self.file_uuid,
                'filetype_Characteristics_generic_s': expected_filetype,
                'genome_build': None,
                u'id': u'data_set_manager.node.#',
                'is_annotation': False,
                'measurement_Characteristics_generic_s': '',
                'measurement_accession_Characteristics_generic_s': '',
                'measurement_source_Characteristics_generic_s': '',
                'name': u'http://example.com/fake.txt',
                'platform_Characteristics_generic_s': '',
                'species': None,
                'study_uuid': self.study_uuid,
                'subanalysis': None,
                'technology_Characteristics_generic_s': 'whizbang',
                'technology_accession_Characteristics_generic_s': '',
                'technology_source_Characteristics_generic_s': '',
                'text': u'',
                'type': u'Raw Data File',
                'uuid': self.node_uuid,
                'workflow_output': None
            }
        )

    def test_prepare_node_with_valid_datafile(self):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=get_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_remote_datafile_source(self):
        self.file_store_item.source = u'http://www.example.org/test.txt'
        self.file_store_item.save()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=self.file_store_item.source,
            expected_filetype=self.file_store_item.filetype,
            expected_datafile=self.file_store_item.datafile
        )

    def test_prepare_node_pending_yet_existing_file_import_task(self):
        with mock.patch.object(FileStoreItem, 'get_import_status',
                               return_value=PENDING):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=constants.NOT_AVAILABLE
            )

    def test_prepare_node_pending_non_existent_file_import_task(self):
        self.import_task.delete()
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value=None):
            with mock.patch.object(FileStoreItem, 'get_import_status',
                                   return_value=FAILURE):
                self._assert_node_index_prepared_correctly(
                    self._prepare_node_index(self.node),
                    expected_download_url=constants.NOT_AVAILABLE
                )

    def test_prepare_node_no_file_import_task_id_yet(self):
        self.file_store_item.import_task_id = ""
        self.file_store_item.save()
        self.import_task.delete()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=PENDING,
            expected_datafile=self.file_store_item.datafile
        )

    def test_prepare_node_no_file_store_item(self):
        with mock.patch('celery.result.AsyncResult'):
            self.file_store_item.delete()
        self._assert_node_index_prepared_correctly(
            self._prepare_node_index(self.node),
            expected_download_url=constants.NOT_AVAILABLE, expected_filetype=''
        )

    def test_prepare_node_s3_file_store_item_source_no_datafile(self):
        self.file_store_item.source = 's3://test/test.txt'
        self.file_store_item.save()
        with mock.patch.object(FileStoreItem, 'get_import_status',
                               return_value=FAILURE):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=constants.NOT_AVAILABLE,
                expected_filetype=self.file_store_item.filetype,
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_s3_file_store_item_source_with_datafile(self):
        self.file_store_item.source = 's3://test/test.txt'
        self.file_store_item.save()
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test.txt'):
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=get_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_filetype=self.file_store_item.filetype,
                expected_datafile=self.file_store_item.datafile
            )

    def _create_analysis_node_connection(self, direction, is_refinery_file):
        user = User.objects.create_user("test", "", "test")
        make_analyses_with_single_dataset(1, user)

        AnalysisNodeConnection.objects.create(
            analysis=Analysis.objects.first(),
            node=self.node,
            direction=direction,
            step=1,
            name="{} Analysis Node Connection".format(direction),
            filename="test.txt",
            is_refinery_file=is_refinery_file
        )

    def test_prepare_node_with_non_exposed_input_node_connection_isnt_skipped(
            self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(INPUT_CONNECTION, False)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=get_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_with_exposed_input_node_connection_isnt_skipped(
            self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(INPUT_CONNECTION, True)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=get_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )

    def test_prepare_node_with_non_exposed_output_node_connection_is_skipped(
            self
    ):
        self._create_analysis_node_connection(OUTPUT_CONNECTION, False)
        with self.assertRaises(SkipDocument):
            self._prepare_node_index(self.node)

    def test_prepare_node_with_exposed_output_node_connection_isnt_skipped(
        self
    ):
        with mock.patch.object(FileStoreItem, 'get_datafile_url',
                               return_value='/media/file_store/test_file.txt'):
            self._create_analysis_node_connection(OUTPUT_CONNECTION, True)
            self._assert_node_index_prepared_correctly(
                self._prepare_node_index(self.node),
                expected_download_url=get_absolute_url(
                    self.file_store_item.get_datafile_url()
                ),
                expected_datafile=self.file_store_item.datafile
            )


@contextlib.contextmanager
def temporary_directory(*args, **kwargs):
    d = tempfile.mkdtemp(*args, **kwargs)
    try:
        yield d
    finally:
        shutil.rmtree(d)


class IsaTabTestBase(TestCase):
    def setUp(self):
        logging.getLogger(
            "data_set_manager.isa_tab_parser"
        ).setLevel(logging.ERROR)

        # no need to update Solr index in tests
        self.update_node_index_mock = mock.patch(
            "data_set_manager.search_indexes.NodeIndex.update_object"
        ).start()

        test_user = "test_user"
        self.user = User.objects.create_user(test_user)
        self.user.set_password(test_user)
        self.user.save()
        self.isa_tab_import_url = "/data_set_manager/import/isa-tab-form/"
        self.client.login(username=self.user.username, password=test_user)

    def tearDown(self):
        mock.patch.stopall()
        FileStoreItem.objects.all().delete()

    def post_isa_tab(self, isa_tab_url=None, isa_tab_file=None,
                     data_set_uuid=None):
        post_data = {
            "isa_tab_url": isa_tab_url,
            "isa_tab_file": isa_tab_file
        }
        url = self.isa_tab_import_url
        if data_set_uuid is not None:
            url += "?data_set_uuid={}".format(data_set_uuid)

        response = self.client.post(
            url,
            data=post_data,
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        return response


class IsaTabParserTests(IsaTabTestBase):
    def failed_isatab_assertions(self):
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(AnnotatedNode.objects.count(), 0)
        self.assertEqual(Node.objects.count(), 0)
        self.assertEqual(FileStoreItem.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)

    def parse(self, dir_name):
        file_source_translator = generate_file_source_translator(
            username=self.user.username
        )
        dir = os.path.join(TEST_DATA_BASE_PATH, dir_name)
        return IsaTabParser(
            file_source_translator=file_source_translator
        ).run(dir)

    def test_empty(self):
        with temporary_directory() as tmp:
            with self.assertRaises(ParserException):
                self.parse(tmp)

    def test_minimal(self):
        investigation = self.parse('minimal')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 1)

        assays = studies[0].assay_set.all()
        self.assertEqual(len(assays), 1)

    def test_mising_investigation(self):
        with self.assertRaises(ParserException):
            self.parse('missing-investigation')

    def test_mising_study(self):
        with self.assertRaises(IOError):
            self.parse('missing-study')

    def test_mising_assay(self):
        with self.assertRaises(IOError):
            self.parse('missing-assay')

    def test_multiple_investigation(self):
        # TODO: I think this should fail?
        self.parse('multiple-investigation')

    def test_multiple_study(self):
        investigation = self.parse('multiple-study')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 2)

        assays0 = studies[0].assay_set.all()
        self.assertEqual(len(assays0), 1)

        assays1 = studies[1].assay_set.all()
        self.assertEqual(len(assays1), 1)

    def test_multiple_study_missing_assay(self):
        with self.assertRaises(IOError):
            self.parse('multiple-study-missing-assay')

    def test_multiple_assay(self):
        investigation = self.parse('multiple-assay')

        studies = investigation.study_set.all()
        self.assertEqual(len(studies), 1)

        assays = studies[0].assay_set.all()
        self.assertEqual(len(assays), 2)

    def test_bad_isatab_rollback_from_parser_exception_a(self):
        with self.assertRaises(IOError):
            parse_isatab(self.user.username, False,
                         os.path.join(TEST_DATA_BASE_PATH,
                                      "HideLabBrokenA.zip"))
        self.failed_isatab_assertions()

    def test_bad_isatab_rollback_from_parser_exception_b(self):
        with self.assertRaises(IOError):
            parse_isatab(self.user.username, False,
                         os.path.join(TEST_DATA_BASE_PATH,
                                      "HideLabBrokenB.zip"))
        self.failed_isatab_assertions()


@override_settings(
    REFINERY_DATA_IMPORT_DIR=os.path.abspath(TEST_DATA_BASE_PATH)
)
class MetadataImportTestBase(IsaTabTestBase):
    def setUp(self):
        super(MetadataImportTestBase, self).setUp()
        self.test_user_directory = os.path.join(
            TEST_DATA_BASE_PATH, self.user.username
        )
        os.mkdir(self.test_user_directory)

    def tearDown(self):
        with mock.patch.object(FileStoreItem, "terminate_file_import_task"):
            super(MetadataImportTestBase, self).tearDown()
        shutil.rmtree(self.test_user_directory)

    def successful_import_assertions(self):
        self.assertEqual(DataSet.objects.count(), 1)
        self.assertEqual(Study.objects.count(), 1)
        self.assertEqual(Investigation.objects.count(), 1)
        self.assertEqual(Assay.objects.count(), 1)

    def unsuccessful_import_assertions(self):
        self.assertEqual(DataSet.objects.count(), 0)
        self.assertEqual(Study.objects.count(), 0)
        self.assertEqual(Investigation.objects.count(), 0)
        self.assertEqual(Assay.objects.count(), 0)

    def get_test_file_path(self, file_name):
        return os.path.join(TEST_DATA_BASE_PATH, file_name)

    def post_tabular_meta_data_file(self,
                                    meta_data_file_path=None,
                                    data_set_uuid=None,
                                    title="Test Tabular File",
                                    data_file_column=2,
                                    species_column=1,
                                    source_column_index=0,
                                    delimiter="comma"):
        with open(meta_data_file_path) as f:
            post_data = {
                "file": f,
                "file_name": os.path.basename(meta_data_file_path),
                "title": title,
                "data_file_column": data_file_column,
                "species_column": species_column,
                "source_column_index": source_column_index,
                "delimiter": delimiter
            }
            url = "/data_set_manager/import/metadata-table-form/"
            if data_set_uuid is not None:
                url += "?data_set_uuid={}".format(data_set_uuid)

            response = self.client.post(
                url,
                data=post_data,
                HTTP_X_REQUESTED_WITH='XMLHttpRequest'
            )
        return response


class SingleFileColumnParserTests(TestCase):
    def setUp(self):
        self.file_import_mock = mock.patch.object(FileImportTask,
                                                  'delay').start()

    def tearDown(self):
        mock.patch.stopall()

    def process_csv(self, filename):
        path = os.path.join(
            TEST_DATA_BASE_PATH,
            'single-file',
            filename
        )
        with open(path) as f:
            dataset_uuid = process_metadata_table(
                username='guest',
                title='fake',
                metadata_file=f,
                source_columns=[0],
                data_file_column=2,
            )
        return DataSet.objects.get(uuid=dataset_uuid)

    def assert_expected_nodes(self, dataset, node_count):
        assays = dataset.get_assays()
        self.assertEqual(len(assays), 1)
        data_nodes = Node.objects.filter(assay=assays[0], type='Raw Data File')
        self.assertEqual(len(data_nodes), node_count)

    def test_one_line_csv(self):
        dataset = self.process_csv('one-line.csv')
        self.assert_expected_nodes(dataset, 1)

    def test_two_line_csv(self):
        dataset = self.process_csv('two-line.csv')
        self.assert_expected_nodes(dataset, 2)

    def test_reindex_triggered_for_nodes_missing_datafiles(self):
        with mock.patch(
            "data_set_manager.search_indexes.NodeIndex.update_object"
        ) as update_object_mock:
            dataset = self.process_csv('two-line-local.csv')

        self.assert_expected_nodes(dataset, 2)
        self.assertEqual(2, update_object_mock.call_count)

    def test_reindex_triggered_for_s3_nodes_missing_datafiles(self):
        with mock.patch(
                "data_set_manager.search_indexes.NodeIndex.update_object"
        ) as update_object_mock:
            dataset = self.process_csv('two-line-s3.csv')

        self.assert_expected_nodes(dataset, 2)
        self.assertEqual(2, update_object_mock.call_count)


class UpdateMissingAttributeOrderTests(TestMigrations):
    migrate_from = '0004_auto_20171211_1145'
    migrate_to = '0005_update_attribute_orders'

    def setUpBeforeMigration(self, apps):
        self.datasets_to_create = 3
        for i in xrange(self.datasets_to_create):
            create_dataset_with_necessary_models()

        self.assertEqual(
            0,
            AttributeOrder.objects.filter(
                solr_field=NodeIndex.DOWNLOAD_URL
            ).count()
        )

    def test_attribute_orders_created(self):
        self.assertEqual(
            self.datasets_to_create,
            AttributeOrder.objects.filter(
                solr_field=NodeIndex.DOWNLOAD_URL
            ).count()
        )
        for attribute_order in AttributeOrder.objects.all():
            self.assertTrue(attribute_order.is_exposed)
            self.assertTrue(attribute_order.is_active)
            self.assertFalse(attribute_order.is_facet)
            self.assertFalse(attribute_order.is_internal)
            self.assertEqual(0, attribute_order.rank)
            self.assertEqual(NodeIndex.DOWNLOAD_URL,
                             attribute_order.solr_field)


class InvestigationTests(IsaTabTestBase):
    def setUp(self):
        super(InvestigationTests, self).setUp()
        self.isa_tab_dataset = create_dataset_with_necessary_models(
            is_isatab_based=True
        )
        self.isa_tab_investigation = self.isa_tab_dataset.get_investigation()

        self.tabular_dataset = create_dataset_with_necessary_models()
        self.tabular_investigation = self.tabular_dataset.get_investigation()

    def test_get_isa_archive_file_store_item(self):
        self.assertIsNotNone(self.isa_tab_investigation.get_file_store_item())

    def test_get_pre_isa_archive_file_store_item(self):
        self.assertIsNotNone(self.tabular_investigation.get_file_store_item())

    def test_get_identifier(self):
        self.assertEqual(self.isa_tab_investigation.get_identifier(),
                         self.isa_tab_investigation.identifier)

    def test_get_identifier_no_identifier(self):
        # Investigations without identifiers should resort to using the
        # info from their Study
        self.isa_tab_investigation.identifier = None
        self.isa_tab_investigation.save()
        self.assertEqual(self.isa_tab_investigation.get_identifier(),
                         self.isa_tab_dataset.get_latest_study().identifier)

    def test_get_description(self):
        self.assertEqual(self.isa_tab_investigation.get_description(),
                         self.isa_tab_investigation.description)

    def test_get_description_no_description(self):
        # Investigations without descriptions should resort to using the
        # info from their Study
        self.isa_tab_investigation.description = None
        self.isa_tab_investigation.save()
        self.assertEqual(self.isa_tab_investigation.get_description(),
                         self.isa_tab_dataset.get_latest_study().description)

    def test_get_study_count(self):
        self.assertEqual(self.isa_tab_investigation.get_study_count(), 1)

    def test_get_assay_count(self):
        self.assertEqual(self.isa_tab_investigation.get_assay_count(), 1)

    def test_get_datafile_names(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(
            investigation.get_datafile_names(),
            [u'rfc-test.zip', u'rfc111.txt', u'rfc125.txt', u'rfc126.txt',
             u'rfc134.txt', u'rfc174.txt', u'rfc177.txt', u'rfc178.txt',
             u'rfc86.txt', u'rfc94.txt']
        )

    def test_get_datafile_names_local_only(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(investigation.get_datafile_names(local_only=True),
                         [u'rfc-test.zip'])

    def test_get_datafile_names_exclude_metadata_file(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(investigation.get_datafile_names(
            exclude_metadata_file=True),
            [u'rfc111.txt', u'rfc125.txt', u'rfc126.txt', u'rfc134.txt',
             u'rfc174.txt', u'rfc177.txt', u'rfc178.txt', u'rfc86.txt',
             u'rfc94.txt'])

    def test_get_file_store_items(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items()), 10)

    def test_get_file_store_items_exclude_metadata_file(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items(
            exclude_metadata_file=True)), 9)

    def test_get_file_store_items_local_only(self):
        with open(os.path.join(TEST_DATA_BASE_PATH, "rfc-test.zip")) as isatab:
            self.post_isa_tab(isa_tab_file=isatab)
        investigation = DataSet.objects.last().get_investigation()
        self.assertEqual(len(investigation.get_file_store_items(
            local_only=True)), 1)


@override_storage()
@override_settings(CELERY_ALWAYS_EAGER=True)
class TestManagementCommands(TestCase):
    def setUp(self):
        self.test_data_base_path = os.path.join(TEST_DATA_BASE_PATH,
                                                "single-file")
        self.args = [
            "--username", "guest",
            "--source_column_index", "2",
            "--data_file_column", "2",
        ]

    def test_process_metadata_table_csv(self):
        two_line_csv = os.path.join(self.test_data_base_path,
                                    "two-line-local.csv")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test csv",
                "--file_name", two_line_csv,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True,
            delimiter="comma"
        )
        self.assertEqual(DataSet.objects.count(), 1)

        # One metadata file & two data files referenced in the metadata
        self.assertEqual(FileStoreItem.objects.count(), 3)

    def test_process_metadata_table_tsv(self):
        two_line_tsv = os.path.join(self.test_data_base_path,
                                    "two-line-local.tsv")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test csv",
                "--file_name", two_line_tsv,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True
        )
        self.assertEqual(DataSet.objects.count(), 1)

    def test_process_metadata_table_custom_delimiter(self):
        two_line_custom = os.path.join(self.test_data_base_path,
                                       "two-line-local.custom")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test custom delimiter",
                "--file_name", two_line_custom,
            ]
        )
        call_command(
            "process_metadata_table",
            *self.args,
            base_path=self.test_data_base_path,
            is_public=True,
            delimiter="custom",
            custom_delimiter_string="@"
        )
        self.assertEqual(DataSet.objects.count(), 1)

    def test_process_metadata_table_custom_delimiter_none_specified(self):
        two_line_custom = os.path.join(self.test_data_base_path,
                                       "two-line-local.custom")
        self.args.extend(
            [
                "--title", "Process Metadata Table Test custom delimiter",
                "--file_name", two_line_custom,
            ]
        )
        with self.assertRaises(CommandError) as context:
            call_command(
                "process_metadata_table",
                *self.args,
                base_path=self.test_data_base_path,
                is_public=True,
                delimiter="custom"
            )
        self.assertIn("custom_delimiter_string was not specified",
                      context.exception.message)
        self.assertEqual(DataSet.objects.count(), 0)
