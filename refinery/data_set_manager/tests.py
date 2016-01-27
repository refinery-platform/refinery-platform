"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
import json

from django.utils import unittest, simplejson
from django.test import TestCase
from django.core.urlresolvers import reverse

from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.test import force_authenticate

from .models import AttributeOrder, Assay, Study, Investigation
from .views import Assays, AssaysFiles, AssaysAttributes
from core.models import User


class SimpleTest(TestCase):
    def test_basic_addition(self):
        """
        Tests that 1 + 1 always equals 2.
        """
        self.assertEqual(1 + 1, 2)


class AssaysAPITests(APITestCase):

    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
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
        self.view = Assays.as_view()
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def test_get(self):

        #valid_uuid
        uuid = self.valid_uuid
        request = self.factory.get('/assay/%s/' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
                response.content,
                '{"uuid":"%s",'
                '"study":"None: Study Title Test",'
                '"measurement":"transcription factor binding site",'
                '"measurement_accession":"http://www.testurl.org/testID",'
                '"measurement_source":"OBI",'
                '"technology":"nucleotide sequencing",'
                '"technology_accession":"test info",'
                '"technology_source":"test source",'
                '"platform":"Genome Analyzer II",'
                '"file_name":"test_assay_filename.txt"}'
                % uuid
                )
        # invalid_uuid
        uuid = self.invalid_uuid
        request = self.factory.get('/assay/%s/' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content, '{"detail":"Not found."}')

        # invalid_format_uuid
        uuid = self.invalid_format_uuid
        request = self.factory.get('/assay/%s/' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertNotEqual(
                response.content,
                '{"uuid":"%s",'
                '"study":"None: Study Title Test",'
                '"measurement":"transcription factor binding site",'
                '"measurement_accession":"http://www.testurl.org/testID",'
                '"measurement_source":"OBI",'
                '"technology":"nucleotide sequencing",'
                '"technology_accession":"test info",'
                '"technology_source":"test source",'
                '"platform":"Genome Analyzer II",'
                '"file_name":"test_assay_filename.txt"}'
                % uuid)
        self.assertEqual(response.content, '{"detail":"Not found."}')


class AssaysFilesAPITests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        investigation = Investigation.objects.create()
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
        AttributeOrder.objects.create(
            study=study,
            assay=assay,
            solr_field='Character_Title',
            rank=1,
            is_exposed=True,
            is_facet=True,
            is_active=True,
            is_internal=False
        )
        AttributeOrder.objects.create(
            study=study,
            assay=assay,
            solr_field='Specimen',
            rank=2,
            is_exposed=True,
            is_facet=True,
            is_active=True,
            is_internal=False
        )
        AttributeOrder.objects.create(
            study=study,
            assay=assay,
            solr_field='Cell Type',
            rank=3,
            is_exposed=True,
            is_facet=True,
            is_active=True,
            is_internal=False
        )
        AttributeOrder.objects.create(
            study=study,
            assay=assay,
            solr_field='Analysis',
            rank=4,
            is_exposed=True,
            is_facet=True,
            is_active=True,
            is_internal=False
        )

        self.valid_uuid = assay.uuid
        self.view = AssaysAttributes.as_view()
        self.invalid_uuid = "0xxx000x-00xx-000x-xx00-x00x00x00x0x"
        self.invalid_format_uuid = "xxxxxxxx"

    def test_get(self):

        #valid_uuid
        uuid = self.valid_uuid
        request = self.factory.get('/assay/%s/attributes' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
                response.content,
                '[{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Character_Title",'
                '"rank":"1",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Specimen",'
                '"rank":"2",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Cell Type",'
                '"rank":"3",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Analysis",'
                '"rank":"4",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false}]'
                )

        # invalid uuid
        uuid = self.invalid_format_uuid
        request = self.factory.get('/assay/%s/files' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertNotEqual(
                response.content,
                '[{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Character_Title",'
                '"rank":"1",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Specimen",'
                '"rank":"2",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Cell Type",'
                '"rank":"3",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Analysis",'
                '"rank":"4",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false}]'
                )
        self.assertEqual(response.content, '{"detail":"Not found."}')

        # invalid uuid
        uuid = ""
        request = self.factory.get('/assay/%s/files' % uuid)
        response = self.view(request, uuid)
        response.render()
        self.assertEqual(response.status_code, 404)
        self.assertNotEqual(
                response.content,
                '[{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Character_Title",'
                '"rank":"1",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Specimen",'
                '"rank":"2",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Cell Type",'
                '"rank":"3",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false},'
                '{"study":"None: Study Title Test",'
                '"assay":'
                '"Measurement: transcription factor binding site; '
                'Technology: nucleotide sequencing; '
                'Platform: Genome Analyzer II; '
                'File: test_assay_filename.txt",'
                '"solr_field":"Analysis",'
                '"rank":"4",'
                '"is_exposed":true,'
                '"is_facet":true,'
                '"is_active":true,'
                '"is_internal":false}]'
                )
        self.assertEqual(response.content, '{"detail":"Not found."}')
