import datetime
import mock

from core.models import DataSet
from data_set_manager.tests import MetadataImportTestBase
from data_set_manager.utils import ISAToolsDictCreator
from file_store.tasks import FileImportTask


class ISATabExportTests(MetadataImportTestBase):
    maxDiff = None

    @mock.patch.object(FileImportTask, 'delay')
    def test_get_isa_tools_dict_simple_isatab(self, file_import_task_mock):
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
                                'term': u'1969 - 1979',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'process_sequence': '',
                            'technology_platform': u'',
                            'technology_type': {
                                'comments': [],
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

    @mock.patch.object(FileImportTask, 'delay')
    def test_get_isa_tools_dict_complex_isatab(self, file_import_task_mock):
        expected = {
            'comments': [],
            'contacts': [],
            'description': u'Type 2 diabetes mellitus is the result of a '
                           u'combination of impaired insulin secretion with '
                           u'reduced insulin sensitivity of target tissues. '
                           u'There are an estimated 150 million affected '
                           u'individuals worldwide, of whom a large '
                           u'proportion remains undiagnosed because of a '
                           u'lack of specific symptoms early in this '
                           u'disorder and inadequate diagnostics. In this '
                           u'study, NMR-based metabolomic analysis in '
                           u'conjunction with uni- and multivariate '
                           u'statistics was applied to examine the urinary '
                           u'metabolic changes in Human type 2 diabetes '
                           u'mellitus patients compared to the control '
                           u'group. The human population were un medicated '
                           u'diabetic patients who have good daily dietary '
                           u'control over their blood glucose concentrations '
                           u'by following the guidelines on diet issued by '
                           u'the American Diabetes Association. Note: This '
                           u'is part of a larger study, please refer to the '
                           u'original paper below.',
            'filename': 'i_Investigation.txt',
            'identifier': u'MTBLS1',
            'ontology_source_references': [],
            'public_release_date': None,
            'publications': [],
            'studies': [
                {
                    'assays': [
                        {
                            'characteristic_categories': '',
                            'comments': [],
                            'filename': u'a_mtbls1_metabolite_profiling_NMR_sp'
                                        u'ectroscopy.txt',
                            'graph': '',
                            'materials': '',
                            'measurement_type': {
                                'comments': [],
                                'term': u'metabolite profiling',
                                'term_accession': u'http://purl.obolibrary'
                                                  u'.org/obo/OBI_0000366',
                                'term_source': u'OBI'
                            },
                            'process_sequence': '',
                            'technology_platform': u'Bruker',
                            'technology_type': {
                                'comments': [],
                                'term': u'NMR spectroscopy',
                                'term_accession': None,
                                'term_source': u'OBI'
                            },
                            'units': ''
                        }
                    ],
                    'characteristic_categories': '',
                    'comments': [],
                    'contacts': [
                        {
                            'address': u'The Department of Biochemistry, '
                                       u'The Sanger Building, 80 Tennis '
                                       u'Court Road, Cambridge, CB2 1GA, UK.',
                            'affiliation': u'University of Cambridge',
                            'comments': [],
                            'email': u'jlg40@cam.ac.uk',
                            'fax': u'',
                            'first_name': u'Jules',
                            'last_name': u'Griffin',
                            'mid_initials': u'L',
                            'phone': u'01223674922',
                            'roles': [u'principal investigator role']
                        },
                        {
                            'address': u'The Department of Biochemistry, '
                                       u'The Sanger Building, 80 Tennis '
                                       u'Court Road, Cambridge, CB2 1GA, UK.',
                            'affiliation': u'University of Cambridge',
                            'comments': [],
                            'email': u'rms72@cam.ac.uk',
                            'fax': u'',
                            'first_name': u'Reza',
                            'last_name': u'Salek',
                            'mid_initials': u'M',
                            'phone': u'01223674948',
                            'roles': [u'principal investigator role']
                        }
                    ],
                    'description': u'Type 2 diabetes mellitus is the result '
                                   u'of a combination of impaired insulin '
                                   u'secretion with reduced insulin '
                                   u'sensitivity of target tissues. There '
                                   u'are an estimated 150 million affected '
                                   u'individuals worldwide, of whom a large '
                                   u'proportion remains undiagnosed because '
                                   u'of a lack of specific symptoms early in '
                                   u'this disorder and inadequate '
                                   u'diagnostics. In this study, NMR-based '
                                   u'metabolomic analysis in conjunction '
                                   u'with uni- and multivariate statistics '
                                   u'was applied to examine the urinary '
                                   u'metabolic changes in Human type 2 '
                                   u'diabetes mellitus patients compared to '
                                   u'the control group. The human population '
                                   u'were un medicated diabetic patients who '
                                   u'have good daily dietary control over '
                                   u'their blood glucose concentrations by '
                                   u'following the guidelines on diet issued '
                                   u'by the American Diabetes Association. '
                                   u'Note: This is part of a larger study, '
                                   u'please refer to the original paper '
                                   u'below.',
                    'design_descriptors': [],
                    'factors': [
                        {
                            'comments': [],
                            'factor_type': {
                                'comments': [],
                                'term': u'Gender',
                                'term_accession': u'http://ncicb.nci.nih.gov'
                                                  u'/xml/owl/EVS/Thesaurus'
                                                  u'.owl#C17357',
                                'term_source': u'NCIT'
                            },
                            'name': u'Gender'
                        },
                        {
                            'comments': [],
                            'factor_type': {
                                'comments': [],
                                'term': u'metabolic syndrome',
                                'term_accession': u'http://www.ebi.ac.uk/efo'
                                                  u'/EFO_0000195',
                                'term_source': u'EFO'
                            },
                            'name': u'Metabolic syndrome'
                        }
                    ],
                    'filename': u's_MTBLS1.txt',
                    'graph': '',
                    'identifier': u'MTBLS1',
                    'materials': '',
                    'other_material': '',
                    'process_sequence': '',
                    'protocols': [
                        {
                            'description': u'For the human studies, '
                                           u'midstream urine (\u223c15 ml) '
                                           u'samples were collected and '
                                           u'frozen from each volunteer. In '
                                           u'total, 84 samples were '
                                           u'collected from 12 healthy '
                                           u'volunteers (7 time points, '
                                           u'8 males and 4 females) and 50 '
                                           u'samples from 30 T2DM patients ('
                                           u'1\u20133 time points, 17 males '
                                           u'and 13 females) with '
                                           u'well-controlled blood glucose '
                                           u'maintained at normal '
                                           u'concentrations by diet, '
                                           u'following the guidelines issued '
                                           u'by the American Diabetes '
                                           u'Association, rather than '
                                           u'medication. The healthy '
                                           u'subjects were aged 18\u201355 '
                                           u'yr, had a body mass index (BMI) '
                                           u'\u226519 and \u226430 kg/m2 and '
                                           u'a body mass \u226550 kg and '
                                           u'\u2264113 kg, and were free '
                                           u'from any major disease or '
                                           u'pregnancy. The T2DM patients '
                                           u'were aged 30\u201365 yr (mean '
                                           u'56 \xb1 9 yr), had a BMI >25 '
                                           u'and <40 kg/m2, weighed between '
                                           u'65 and 140 kg (mean 95 \xb1 19 '
                                           u'kg), and were taking at most '
                                           u'one oral anti-diabetic drug. '
                                           u'T2DM patients agreed to stop '
                                           u'treatment with oral '
                                           u'anti-diabetic agents during the '
                                           u'study. Subjects went through a '
                                           u'washout period of 4 wk before '
                                           u'sample collection and abstained '
                                           u'from alcohol during the study; '
                                           u'diet was controlled throughout '
                                           u'the study.',
                            'name': u'Extraction',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'Extraction',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'Aliquots of 400 \xb5l urine '
                                           u'samples were made up to 600 '
                                           u'\xb5l with phosphate buffer ('
                                           u'0.2 M, pH 7.4) and any '
                                           u'precipitate removed by '
                                           u'centrifugation. In total, '
                                           u'500 \xb5l of supernatant were '
                                           u'transferred to 5-mm NMR tubes '
                                           u'with 100 \xb5l of sodium '
                                           u'3-trimethylsilyl-(2,2,3,'
                                           u'3-2H4)-1-propionate ('
                                           u'TSP)/D2O/sodium azide solution '
                                           u'(0.05% wt/vol TSP in D2O and 1% '
                                           u'wt/vol sodium azide).',
                            'name': u'NMR sample',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'NMR sample',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'The spectra of human urine '
                                           u'samples were acquired on a '
                                           u'Bruker DRX700 NMR spectrometer '
                                           u'using a 5 mm TXI ATMA probe at '
                                           u'a proton frequency of 700.1 MHz '
                                           u'and ambient temperature of 27 '
                                           u'\xb0C.',
                            'name': u'NMR spectroscopy',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'NMR spectroscopy',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'A 1D NOESY presaturation pulse '
                                           u'sequence was used to analyze '
                                           u'the urine samples. For each '
                                           u'sample 128 transients were '
                                           u'collected into 64k data points '
                                           u'using a spectral width of '
                                           u'14.005 kHz (20 ppm) and an '
                                           u'acquisition time of 2.34 s per '
                                           u'FID.',
                            'name': u'NMR assay',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'NMR assay',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'Spectra were processed using '
                                           u'ACD/1D NMR Manager 8.0 with '
                                           u'Intelligent Bucketing '
                                           u'Integration (Advanced Chemistry '
                                           u'Development, Toronto, ON, '
                                           u'Canada). Spectra were '
                                           u'integrated 0.20-9.30 ppm '
                                           u'excluding water (4.24-5.04 '
                                           u'ppm), glucose (3.19-3.99 ppm, '
                                           u'5.21-5.27 ppm), and urea ('
                                           u'5.04-6.00 ppm). Intelligent '
                                           u'bucketing ensures that bucket '
                                           u'edges do not coincide with peak '
                                           u'maxima, preventing resonances '
                                           u'from being split across '
                                           u'separate integral regions; a '
                                           u'0.04 ppm bucket width and a 50% '
                                           u'looseness factor were used. All '
                                           u'spectra were normalized to '
                                           u'total area excluding the water, '
                                           u'urea, and glucose regions.',
                            'name': u'Data transformation',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'Data transformation',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'http://www.acdlabs.com/products/adh/nmr'
                                   u'/1d_man/',
                            'version': u'ACD nmr manager 8.0'},
                        {
                            'description': u'Assignments were confirmed by '
                                           u'two dimensional spectroscopy '
                                           u'including homonuclear 1H-1H '
                                           u'Correlation Spectroscopy ('
                                           u'COSY), 1H-13C Heteronuclear '
                                           u'Signal Quantum Coherence (HSQC) '
                                           u'and 1H-13C Heteronuclear '
                                           u'Multiple Bond Correlation ('
                                           u'HMBC) Spectroscopy.',
                            'name': u'Metabolite identification',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'Metabolite identification',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'For the human studies, '
                                           u'midstream urine (~15 ml) '
                                           u'samples were collected and '
                                           u'frozen from each volunteer. In '
                                           u'total, 84 samples were '
                                           u'collected from 12 healthy '
                                           u'volunteers (7 time points, '
                                           u'8 males and 4 females) and 50 '
                                           u'samples from 30 T2DM patients ('
                                           u'1-3 time points, 17 males and '
                                           u'13 females) with '
                                           u'well-controlled blood glucose '
                                           u'maintained at normal '
                                           u'concentrations by diet, '
                                           u'following the guidelines issued '
                                           u'by the American Diabetes '
                                           u'Association, rather than '
                                           u'medication. T2DM patients '
                                           u'agreed to stop treatment with '
                                           u'oral anti-diabetic agents '
                                           u'during the study. Subjects went '
                                           u'through a washout period of 4 '
                                           u'wk before sample collection and '
                                           u'abstained from alcohol during '
                                           u'the study; diet was controlled '
                                           u'throughout the study.',
                            'name': u'Sample collection',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'term': u'Sample collection',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        }
                    ],
                    'public_release_date': datetime.date(2014, 11, 25),
                    'publications': [
                        {
                            'author_list': u'Salek RM,Maguire ML,Bentley E,'
                                           u'Rubtsov DV,Hough T,Cheeseman M,'
                                           u'Nunez D,Sweatman BC,Haselden '
                                           u'JN,Cox RD,Connor SC,Griffin JL',
                            'comments': [],
                            'doi': u'http://dx.doi.org/10.1152'
                                   u'/physiolgenomics.00194.2006',
                            'pubmed_id': u'17190852',
                            'status': {
                                'comments': [],
                                'term': u'Published',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'title': u'A metabolomic comparison of urinary '
                                     u'changes in type 2 diabetes in mouse, '
                                     u'rat, and human.'
                        }
                    ],
                    'samples': '',
                    'sources': '',
                    'submission_date': datetime.date(2012, 2, 14),
                    'title': u'A metabolomic study of urinary changes in '
                             u'type 2 diabetes in human comapred to the '
                             u'control group',
                    'units': ''
                }
            ],
            'submission_date': None,
            'title': u'A metabolomic study of urinary changes in type 2 '
                     u'diabetes in human comapred to the control group'
        }

        with open(self.get_test_file_path('MTBLS1.zip')) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)

        dataset = DataSet.objects.all().first()
        isa_tools_dict = ISAToolsDictCreator(dataset).create()
        self.assertEqual(isa_tools_dict, expected)
