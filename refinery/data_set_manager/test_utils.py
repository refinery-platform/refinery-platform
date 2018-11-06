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

    @mock.patch.object(FileImportTask, 'delay')
    def test_get_isa_tools_dict_complex_isatab(self, file_import_task_mock):
        expected = {
            'comments': [],
            'contacts': [],
            'description': u'Type 2 diabetes mellitus is the result of a combination of impaired insulin secretion with reduced insulin sensitivity of target tissues. There are an estimated 150 million affected individuals worldwide, of whom a large proportion remains undiagnosed because of a lack of specific symptoms early in this disorder and inadequate diagnostics. In this study, NMR-based metabolomic analysis in conjunction with uni- and multivariate statistics was applied to examine the urinary metabolic changes in Human type 2 diabetes mellitus patients compared to the control group. The human population were un medicated diabetic patients who have good daily dietary control over their blood glucose concentrations by following the guidelines on diet issued by the American Diabetes Association. Note: This is part of a larger study, please refer to the original paper below.',
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
                            'filename': u'a_mtbls1_metabolite_profiling_NMR_spectroscopy.txt',
                            'graph': '',
                            'materials': '',
                            'measurement_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'metabolite profiling',
                                'term_accession': u'http://purl.obolibrary.org/obo/OBI_0000366',
                                'term_source': u'OBI'
                            },
                            'process_sequence': '',
                            'technology_platform': u'Bruker',
                            'technology_type': {
                                'comments': [],
                                'id_': '',
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
                            'address': u'The Department of Biochemistry, The Sanger Building, 80 Tennis Court Road, Cambridge, CB2 1GA, UK.',
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
                            'address': u'The Department of Biochemistry, The Sanger Building, 80 Tennis Court Road, Cambridge, CB2 1GA, UK.',
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
                    'description': u'Type 2 diabetes mellitus is the result of a combination of impaired insulin secretion with reduced insulin sensitivity of target tissues. There are an estimated 150 million affected individuals worldwide, of whom a large proportion remains undiagnosed because of a lack of specific symptoms early in this disorder and inadequate diagnostics. In this study, NMR-based metabolomic analysis in conjunction with uni- and multivariate statistics was applied to examine the urinary metabolic changes in Human type 2 diabetes mellitus patients compared to the control group. The human population were un medicated diabetic patients who have good daily dietary control over their blood glucose concentrations by following the guidelines on diet issued by the American Diabetes Association. Note: This is part of a larger study, please refer to the original paper below.',
                    'design_descriptors': [],
                    'factors': [{'comments': [],
                              'factor_type': {'comments': [],
                                              'id_': '',
                                              'term': u'Gender',
                                              'term_accession': u'http://ncicb.nci.nih.gov/xml/owl/EVS/Thesaurus.owl#C17357',
                                              'term_source': u'NCIT'},
                              'id_': '',
                              'name': u'Gender'},
                             {'comments': [],
                              'factor_type': {'comments': [],
                                              'id_': '',
                                              'term': u'metabolic syndrome',
                                              'term_accession': u'http://www.ebi.ac.uk/efo/EFO_0000195',
                                              'term_source': u'EFO'},
                              'id_': '',
                              'name': u'Metabolic syndrome'}],
                    'filename': u's_MTBLS1.txt',
                    'graph': '',
                    'identifier': u'MTBLS1',
                    'materials': '',
                    'other_material': '',
                    'process_sequence': '',
                    'protocols': [
                        {
                            'description': u'For the human studies, midstream urine (\u223c15 ml) samples were collected and frozen from each volunteer. In total, 84 samples were collected from 12 healthy volunteers (7 time points, 8 males and 4 females) and 50 samples from 30 T2DM patients (1\u20133 time points, 17 males and 13 females) with well-controlled blood glucose maintained at normal concentrations by diet, following the guidelines issued by the American Diabetes Association, rather than medication. The healthy subjects were aged 18\u201355 yr, had a body mass index (BMI) \u226519 and \u226430 kg/m2 and a body mass \u226550 kg and \u2264113 kg, and were free from any major disease or pregnancy. The T2DM patients were aged 30\u201365 yr (mean 56 \xb1 9 yr), had a BMI >25 and <40 kg/m2, weighed between 65 and 140 kg (mean 95 \xb1 19 kg), and were taking at most one oral anti-diabetic drug. T2DM patients agreed to stop treatment with oral anti-diabetic agents during the study. Subjects went through a washout period of 4 wk before sample collection and abstained from alcohol during the study; diet was controlled throughout the study.',
                            'name': u'Extraction',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'Extraction',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'Aliquots of 400 \xb5l urine samples were made up to 600 \xb5l with phosphate buffer (0.2 M, pH 7.4) and any precipitate removed by centrifugation. In total, 500 \xb5l of supernatant were transferred to 5-mm NMR tubes with 100 \xb5l of sodium 3-trimethylsilyl-(2,2,3,3-2H4)-1-propionate (TSP)/D2O/sodium azide solution (0.05% wt/vol TSP in D2O and 1% wt/vol sodium azide).',
                            'name': u'NMR sample',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'NMR sample',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'The spectra of human urine samples were acquired on a Bruker DRX700 NMR spectrometer using a 5 mm TXI ATMA probe at a proton frequency of 700.1 MHz and ambient temperature of 27 \xb0C.',
                            'name': u'NMR spectroscopy',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'NMR spectroscopy',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'A 1D NOESY presaturation pulse sequence was used to analyze the urine samples. For each sample 128 transients were collected into 64k data points using a spectral width of 14.005 kHz (20 ppm) and an acquisition time of 2.34 s per FID.',
                            'name': u'NMR assay',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'NMR assay',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'Spectra were processed using ACD/1D NMR Manager 8.0 with Intelligent Bucketing Integration (Advanced Chemistry Development, Toronto, ON, Canada). Spectra were integrated 0.20-9.30 ppm excluding water (4.24-5.04 ppm), glucose (3.19-3.99 ppm, 5.21-5.27 ppm), and urea (5.04-6.00 ppm). Intelligent bucketing ensures that bucket edges do not coincide with peak maxima, preventing resonances from being split across separate integral regions; a 0.04 ppm bucket width and a 50% looseness factor were used. All spectra were normalized to total area excluding the water, urea, and glucose regions.',
                            'name': u'Data transformation',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'Data transformation',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'http://www.acdlabs.com/products/adh/nmr/1d_man/',
                            'version': u'ACD nmr manager 8.0'},
                        {
                            'description': u'Assignments were confirmed by two dimensional spectroscopy including homonuclear 1H-1H Correlation Spectroscopy (COSY), 1H-13C Heteronuclear Signal Quantum Coherence (HSQC) and 1H-13C Heteronuclear Multiple Bond Correlation (HMBC) Spectroscopy.',
                            'name': u'Metabolite identification',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
                                'term': u'Metabolite identification',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'uri': u'',
                            'version': u''
                        },
                        {
                            'description': u'For the human studies, midstream urine (~15 ml) samples were collected and frozen from each volunteer. In total, 84 samples were collected from 12 healthy volunteers (7 time points, 8 males and 4 females) and 50 samples from 30 T2DM patients (1-3 time points, 17 males and 13 females) with well-controlled blood glucose maintained at normal concentrations by diet, following the guidelines issued by the American Diabetes Association, rather than medication. T2DM patients agreed to stop treatment with oral anti-diabetic agents during the study. Subjects went through a washout period of 4 wk before sample collection and abstained from alcohol during the study; diet was controlled throughout the study.',
                            'name': u'Sample collection',
                            'parameters': [],
                            'protocol_type': {
                                'comments': [],
                                'id_': '',
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
                            'author_list': u'Salek RM,Maguire ML,Bentley E,Rubtsov DV,Hough T,Cheeseman M,Nunez D,Sweatman BC,Haselden JN,Cox RD,Connor SC,Griffin JL',
                            'comments': [],
                            'doi': u'http://dx.doi.org/10.1152/physiolgenomics.00194.2006',
                            'pubmed_id': u'17190852',
                            'status': {
                                'comments': [],
                                'id_': '',
                                'term': u'Published',
                                'term_accession': u'',
                                'term_source': u''
                            },
                            'title': u'A metabolomic comparison of urinary changes in type 2 diabetes in mouse, rat, and human.'
                        }
                    ],
                    'samples': '',
                    'sources': '',
                    'submission_date': datetime.date(2012, 2, 14),
                    'title': u'A metabolomic study of urinary changes in type 2 diabetes in human comapred to the control group',
                    'units': ''
                }
            ],
            'submission_date': None,
            'title': u'A metabolomic study of urinary changes in type 2 diabetes in human comapred to the control group'
        }

        with open(self.get_test_file_path('MTBLS1.zip')) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)

        dataset = DataSet.objects.all().first()
        isa_tools_dict = ISAToolsDictCreator(dataset).create()
        self.assertEqual(isa_tools_dict, expected)
