import json

from django.test.utils import override_settings

from core.models import DataSet
from data_set_manager.models import (AnnotatedNode, Assay, Attribute, Node,
                                     Protocol, ProtocolComponent, Study,
                                     ProtocolParameter)
from data_set_manager.tasks import parse_isatab
from data_set_manager.tests import MetadataImportTestBase
from data_set_manager.utils import ISAJSONCreator
from factory_boy.utils import create_dataset_with_necessary_models


def ordered(obj):
    if isinstance(obj, dict):
        return sorted((ordered(k), ordered(v)) for k, v in obj.items())
    if isinstance(obj, list):
        return sorted(ordered(x) for x in obj)
    else:
        return obj


class ISAJSONCreatorTestMixin(object):
    maxDiff = None
    TEST_ISA_TAB_NAME = None

    @classmethod
    def setUpTestData(cls):
        # Set up data for the whole TestCase
        parse_isatab(
            username="test",
            public=False,
            path="data_set_manager/test-data/{}.zip".format(
                cls.TEST_ISA_TAB_NAME
            )
        )

        dataset = DataSet.objects.all().first()
        cls.isa_tools_json_creator = ISAJSONCreator(dataset)

        with open(
            "data_set_manager/test-data/isa-json/{}.json".format(
                cls.TEST_ISA_TAB_NAME
            )
        ) as isa_json:
            cls.expected_isa_json = json.loads(isa_json.read())

    def test__create_comments(self):
        node = Node.objects.create(study=Study.objects.first())
        Attribute.objects.create(
            node=node, type=Attribute.COMMENT, subtype="Test A",
            value="test a value"
        )
        Attribute.objects.create(
            node=node, type=Attribute.COMMENT, subtype="Test B",
            value="test b value"
        )
        Attribute.objects.create(
            node=node, type=Attribute.COMMENT, subtype="Test C",
            value="test c value"
        )

        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_comments_from_node(
                    node=node
                )
            ),
            ordered(
                [{'name': u'Test A', 'value': 'test a value'},
                 {'name': u'Test B', 'value': 'test b value'},
                 {'name': u'Test C', 'value': 'test c value'}]
            )
        )

    def test__create_datafiles(self):
        study = Study.objects.first()
        assay = Assay.objects.get(study=study)

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
            ordered(
                self.isa_tools_json_creator._create_design_descriptors(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(
                self.expected_isa_json["studies"][0]["studyDesignDescriptors"]
            )
        )

    def test__create_factors(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_factors(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["factors"])
        )

    def test__create_factor_values(self):
        study = Study.objects.first()
        assay = Assay.objects.get(study=study)
        node = Node.objects.create(study=study, name="Test Node")
        attribute = Attribute.objects.create(
            node=node, type=Attribute.FACTOR_VALUE, subtype="diet",
            value="vegeterian diet "
                  "(derived from Sorghum, Millet, Black eyed pea)"
        )
        AnnotatedNode.objects.create(
            node_id=node.id,
            attribute_id=attribute.id,
            study=study,
            assay=assay,
            node_uuid=node.uuid,
            node_file_uuid=node.file_uuid,
            node_type=node.type,
            node_name=node.name,
            attribute_type=attribute.type,
            attribute_subtype=attribute.subtype,
            attribute_value=attribute.value,
            attribute_value_unit=attribute.value_unit
        )
        self.assertEqual(
            self.isa_tools_json_creator._create_factor_values(node),
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

    def test__create_materials_assay(self):
        assay = Assay.objects.get(
            study=self.isa_tools_json_creator.studies.first()
        )
        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_materials(assay)),
            ordered(
                self.expected_isa_json["studies"][0]["assays"][0]["materials"]
            ),
        )

    def test__create_materials_study(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_materials(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["materials"]),
        )

    def test__create_characteristics_sample(self):
        node = Node.objects.filter(
            study=self.isa_tools_json_creator.studies.first(), type=Node.SAMPLE
        ).first()

        expected_characteristics = None
        for sample in self.expected_isa_json["studies"][0]["materials"][
            "samples"
        ]:
            if node.name in sample["@id"]:
                expected_characteristics = sample["characteristics"]
                break

        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_characteristics(node)),
            ordered(expected_characteristics),
        )

    def test__create_characteristics_source(self):
        node = Node.objects.filter(
            study=self.isa_tools_json_creator.studies.first(), type=Node.SOURCE
        ).first()

        expected_characteristics = None
        for source in self.expected_isa_json["studies"][0]["materials"][
            "sources"
        ]:
            if node.name in source["@id"]:
                expected_characteristics = source["characteristics"]
                break

        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_characteristics(node)),
            ordered(expected_characteristics),
        )

    def test__create_ontology_annotation(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_ontology_annotation(
                "term", "term_source", "term_accession"
            ),
            {
                "annotationValue": "term",
                "termSource": "term_source",
                "termAccession": "term_accession",
            },
        )

    def test__create_ontology_source_references(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator.
                _create_ontology_source_references()
            ),
            ordered(self.expected_isa_json["ontologySourceReferences"]),
        )

    def test__create_other_materials(self):
        study = Study.objects.first()
        assay = Assay.objects.filter(study=study)

        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_other_materials(
                    assay=assay
                )
            ),
            ordered(
                self.expected_isa_json["studies"][0]["assays"][0]["materials"][
                    "otherMaterials"
                ]
            )

        )

    def test__create_people(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_people(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["people"])
        )

    def test__create_protocol_components(self):
        protocol = Protocol.objects.create(study=Study.objects.first())
        ProtocolComponent.objects.create(
            protocol=protocol,
            name="454 GS FLX Titanium",
            type="DNA sequencer",
            type_source="",
            type_accession=""
        )

        self.assertEqual(
            self.isa_tools_json_creator._create_protocol_components(protocol),
            [
                {
                    "componentType": {
                        "annotationValue": u"DNA sequencer",
                        "termAccession": u"",
                        "termSource": u"",
                    },
                    "componentName": u"454 GS FLX Titanium",
                }
            ],
        )

    def test__create_protocol_parameters(self):
        protocol = Protocol.objects.create(study=Study.objects.first())
        ProtocolParameter.objects.create(
            protocol=protocol,
            name="sequencing instrument",
            name_source="",
            name_accession=""
        )

        ProtocolParameter.objects.create(
            protocol=protocol,
            name="quality scorer",
            name_source="",
            name_accession=""
        )

        ProtocolParameter.objects.create(
            protocol=protocol,
            name="base caller",
            name_source="",
            name_accession=""
        )

        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_protocol_parameters(
                protocol
            )),
            ordered(
                [
                    {
                        "parameterName": {
                            "annotationValue": u"sequencing instrument",
                            "termAccession": u"",
                            "termSource": u"",
                        },
                        "@id": "#parameter/sequencing_instrument",
                    },
                    {
                        "parameterName": {
                            "annotationValue": u"quality scorer",
                            "termAccession": u"",
                            "termSource": u"",
                        },
                        "@id": "#parameter/quality_scorer",
                    },
                    {
                        "parameterName": {
                            "annotationValue": u"base caller",
                            "termAccession": u"",
                            "termSource": u"",
                        },
                        "@id": "#parameter/base_caller",
                    },
                ]
            )
        )

    def test__create_protocols(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_protocols(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(self.expected_isa_json["studies"][0]["protocols"]),
        )

    def test__create_publications(self):
        self.assertEqual(
            self.isa_tools_json_creator._create_publications(
                self.isa_tools_json_creator.studies.first()
            ),
            self.expected_isa_json["studies"][0]["publications"],
        )

    def test__create_samples_assay(self):
        study = Study.objects.first()
        assay = Assay.objects.get(study=study)

        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_samples(assay)),
            ordered(
                self.expected_isa_json["studies"][0]["assays"][0]["materials"][
                    "samples"
                ]
            ),
        )

    def test__create_samples_study(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_samples(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(
                self.expected_isa_json["studies"][0]["materials"]["samples"]
            ),
        )

    def test__create_sources(self):
        self.assertEqual(
            ordered(
                self.isa_tools_json_creator._create_sources(
                    self.isa_tools_json_creator.studies.first()
                )
            ),
            ordered(
                self.expected_isa_json["studies"][0]["materials"]["sources"]
            ),
        )

    def test__create_unit_categories(self):
        self.assertEqual(
            ordered(self.isa_tools_json_creator._create_unit_categories(
                self.isa_tools_json_creator.studies.first()
            )),
            ordered(self.expected_isa_json["studies"][0]["unitCategories"]),
        )

    def test_isa_tab_based_datasets_supported_only(self):
        non_isatab_dataset = create_dataset_with_necessary_models()
        with self.assertRaises(RuntimeError):
            ISAJSONCreator(non_isatab_dataset)


@override_settings(CELERY_ALWAYS_EAGER=True)
class BiiISAJSONCreatorTests(ISAJSONCreatorTestMixin, MetadataImportTestBase):
    @classmethod
    def setUpClass(cls):
        cls.TEST_ISA_TAB_NAME = "BII-S-7"
        super(BiiISAJSONCreatorTests, cls).setUpClass()


@override_settings(CELERY_ALWAYS_EAGER=True)
class StemCellCommonsISAJSONCreatorTests(ISAJSONCreatorTestMixin,
                                         MetadataImportTestBase):
    @classmethod
    def setUpClass(cls):
        cls.TEST_ISA_TAB_NAME = "isa_16410_959845"
        super(StemCellCommonsISAJSONCreatorTests, cls).setUpClass()
