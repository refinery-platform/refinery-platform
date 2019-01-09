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

    def test__create_assays(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_assays(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["assays"]),
        )

    def test__create_comments(self):
        study = self.isa_tools_json_creator.studies.first()
        assay = Assay.objects.filter(study=study)
        nodes = self.isa_tools_json_creator.dataset.get_nodes(
            assay=assay, study=study, type=Node.RAW_DATA_FILE
        )

        self.assertEqual(
            self.isa_tools_json_creator._create_comments(node=nodes.first()),
            [{"name": u"Export", "value": u"yes"}],
        )

    def test__create_datafiles(self):
        study = Study.objects.first()
        assay = Assay.objects.filter(study=study)

        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_datafiles(
                    assay=assay, study=study
                )
            ),
            ordered(
                self.expected_isa_json["studies"][0]["assays"][0]["dataFiles"]
            ),
        )

    def test__create_design_descriptors(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_design_descriptors(
                self.isa_tools_json_creator.studies.first()
            ),
            [
                {
                    "annotationValue": u"Metagenomics",
                    "termAccession": u"",
                    "termSource": u"",
                }
            ],
        )

    def test__create_factors(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_factors(
                self.isa_tools_json_creator.studies.first()
            ),
            [
                {
                    "@id": "#factor/diet",
                    "factorName": u"diet",
                    "factorType": {
                        "annotationValue": u"diet",
                        "termAccession": u"",
                        "termSource": u"",
                    },
                }
            ],
        )

    def test__create_factor_values(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_factor_values(
                self.isa_tools_json_creator.dataset.get_nodes().first()
            ),
            [
                {
                    "category": {"@id": "#factor/diet"},
                    "value": {
                        "annotationValue": u"vegeterian diet (derived from "
                        u"Sorghum, Millet, Black eyed pea)",
                        "termAccession": "",
                        "termSource": "",
                    },
                }
            ],
        )

    def test__create_id(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_id("id", "value"), "#id/value"
        )

    def test__create_id_replaces_spaces_with_underscores(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_id(
                "id", "value that has spaces"
            ),
            "#id/value_that_has_spaces",
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
