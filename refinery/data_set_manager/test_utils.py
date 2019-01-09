import json

from django.test.utils import override_settings

from core.models import DataSet
from data_set_manager.models import Assay, Study
from data_set_manager.tests import MetadataImportTestBase
from data_set_manager.utils import ISAToolsJSONCreator
from factory_boy.utils import create_dataset_with_necessary_models


def ordered(obj):
    if isinstance(obj, dict):
        return sorted((ordered(k), ordered(v)) for k, v in obj.items())
    if isinstance(obj, list):
        return sorted(ordered(x) for x in obj)
    else:
        return obj


@override_settings(CELERY_ALWAYS_EAGER=True)
class ISAToolsJSONCreatorTests(MetadataImportTestBase):
    maxDiff = None

    def setUp(self):
        super(ISAToolsJSONCreatorTests, self).setUp()
        with open(self.get_test_file_path("BII-S-7.zip")) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)

        with open(
            self.get_test_file_path("isa-json/BII-S-7.json")
        ) as isa_json:
            self.expected_isa_json = json.loads(isa_json.read())

        dataset = DataSet.objects.all().first()
        self.isa_tools_json_creator = ISAToolsJSONCreator(dataset)

    def test_create_datafiles(self):
    def test__create_assays(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_assays(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["assays"]),
        )

        study = Study.objects.first()
        assay = Assay.objects.filter(study=study)

        self.assertEqual(
            sorted(
                self.isa_tools_json_creator._create_datafiles(
                    assay=assay, study=study
                ),
                key=lambda d: d['name']
            ),
            sorted(
                self.expected_isa_json_dict["studies"][0]["assays"][0][
                    "dataFiles"
                ],
                key=lambda d: d['name']
            )
        )

    def test_isa_tab_based_datasets_supported_only(self):
        non_isatab_dataset = create_dataset_with_necessary_models()
        with self.assertRaises(RuntimeError):
            ISAToolsJSONCreator(non_isatab_dataset)


@override_settings(CELERY_ALWAYS_EAGER=True)
class ISATabExportIntegrationTests(MetadataImportTestBase):
    def test_bii_dataset_to_isa_json(self):
        self.maxDiff = None
        with open(self.get_test_file_path('BII-S-7.zip')) as good_isa:
            self.post_isa_tab(isa_tab_file=good_isa)

        dataset = DataSet.objects.all().first()
        ISAToolsJSONCreator(dataset).create()

        # TODO More involved testing
