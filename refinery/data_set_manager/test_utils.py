import datetime
import mock

from core.models import DataSet
from data_set_manager.tests import MetadataImportTestBase
from data_set_manager.utils import ISAToolsDictCreator
from file_store.tasks import FileImportTask


class ISATabExportTests(MetadataImportTestBase):
    @mock.patch.object(FileImportTask, 'delay')
    def test_get_isa_tools_dict(self, file_import_task_mock):
        expected = {
            'comments': [],
            'contacts': [],
            'description': u'A collection of RFC documents.',
            'filename': 'i_investigation.txt',
            'identifier': u'Test 1',
            'ontology_source_references': [],
            'public_release_date': None,
            'publications': [],
            'studies': [
                {
                    'assays': [
                        {
                            'characteristic_categories': '',
                            'comments': [],
                            'filename': 'a_assay.txt',
                            'graph': '',
                            'materials': '',
                            'measurement_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'1969 - 1979',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'process_sequence': '',
                            'technology_platform': u'',
                            'technology_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'',
                                'term_accession': None,
                                'term_source': u''
                            },
                            'units': ''
                        }
                    ],
                    'characteristic_categories': '',
                    'comments': [],
                    'contacts': [],
                    'description': u'A collection of RFC documents.',
                    'design_descriptors': [],
                    'factors': [],
                    'filename': 's_study.txt',
                    'graph': '',
                    'identifier': u'IETF Request for Comments',
                    'materials': '',
                    'other_material': '',
                    'process_sequence': '',
                    'protocols': [],
                    'public_release_date': None,
                    'publications': [],
                    'samples': '',
                    'sources': '',
                    'submission_date': datetime.date(2013, 3, 22),
                    'title': u'RFC Documents',
                    'units': ''
                }
            ],
            'submission_date': None,
            'title': u'Request for Comments (RFC) Test'
        }

        with open(self.get_test_file_path('rfc-test.zip')) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)

        dataset = DataSet.objects.all().first()
        isa_tools_dict = ISAToolsDictCreator(dataset).create()
        self.assertEqual(isa_tools_dict, expected)
