'''
Created on May 11, 2012

@author: nils
'''

from collections import deque
import csv
import glob
import itertools
import logging
import os
import re
import string
import tempfile
from zipfile import ZipFile

from file_store.models import FileStoreItem
from file_store.tasks import import_file

from .models import (Assay, Attribute, Contact, Design, Factor, Investigation,
                     Node, Ontology, Protocol, ProtocolReference,
                     ProtocolReferenceParameter, Publication, Study)
from .utils import fix_last_column

logger = logging.getLogger(__name__)


class ParserException(Exception):
    pass


class IsaTabParser:
    # TODO: use these where appropriate
    SEPARATOR_CHARACTER = "\t"
    QUOTE_CHARACTER = "\""
    # investigation file sections
    SECTIONS = {
        "ONTOLOGY SOURCE REFERENCE":
        {
            "model": Ontology,
            "fields":
            {
                "Term Source Name": "name",
                "Term Source File": "file_name",
                "Term Source Version": "version",
                "Term Source Description": "description"
            },
            "references":
            {
                "current_investigation": "investigation"
            }
        },
        "INVESTIGATION":
        {
            "model": Investigation,
            "fields":
            {
                "Investigation Identifier": "identifier",
                "Investigation Title": "title",
                "Investigation Description": "description",
                "Investigation Submission Date": "submission_date",
                "Investigation Public Release Date": "release_date"
            }
        },
        "INVESTIGATION PUBLICATIONS":
        {
            "model": Publication,
            "fields":
            {
                "Investigation PubMed ID": "pubmed_id",
                "Investigation Publication DOI": "doi",
                "Investigation Publication Author list": "authors",
                "Investigation Publication Title": "title",
                "Investigation Publication Status": "status",
                "Investigation Publication Status Term Accession Number":
                    "status_accession",
                "Investigation Publication Status Term Source REF":
                    "status_source"
            },
            "references":
            {
                "current_investigation": "collection"
            }
        },
        "INVESTIGATION CONTACTS":
        {
            "model": Contact,
            "fields":
            {
                "Investigation Person Last Name": "last_name",
                "Investigation Person First Name": "first_name",
                "Investigation Person Mid Initials": "middle_initials",
                "Investigation Person Email": "email",
                "Investigation Person Phone": "phone",
                "Investigation Person Fax": "fax",
                "Investigation Person Address": "address",
                "Investigation Person Affiliation": "affiliation",
                "Investigation Person Roles": "roles",
                "Investigation Person Roles Term Accession Number":
                    "roles_accession",
                "Investigation Person Roles Term Source REF": "roles_source"
            },
            "references":
            {
                "current_investigation": "collection"
            }
        },
        "STUDY":
        {
            "model": Study,
            "fields":
            {
                "Study Identifier": "identifier",
                "Study Title": "title",
                "Study Submission Date": "submission_date",
                "Study Public Release Date": "release_date",
                "Study Description": "description",
                "Study File Name": "file_name",
            },
            "references":
            {
                "current_investigation": "investigation"
            }
        },
        "STUDY PUBLICATIONS":
        {
            "model": Publication,
            "fields":
            {
                "Study PubMed ID": "pubmed_id",
                "Study Publication DOI": "doi",
                "Study Publication Author list": "authors",
                "Study Publication Title": "title",
                "Study Publication Status": "status",
                "Study Publication Status Term Accession Number":
                    "status_accession",
                "Study Publication Status Term Source REF": "status_source"
            },
            "references":
            {
                "current_study": "collection"
            }

        },
        "STUDY CONTACTS":
        {
            "model": Contact,
            "fields":
            {
                "Study Person Last Name": "last_name",
                "Study Person First Name": "first_name",
                "Study Person Mid Initials": "middle_initials",
                "Study Person Email": "email",
                "Study Person Phone": "phone",
                "Study Person Fax": "fax",
                "Study Person Address": "address",
                "Study Person Affiliation": "affiliation",
                "Study Person Roles": "roles",
                "Study Person Roles Term Accession Number": "roles_accession",
                "Study Person Roles Term Source REF": "roles_source"
            },
            "references":
            {
                "current_study": "collection"
            }
        },
        "STUDY DESIGN DESCRIPTORS":
        {
            "model": Design,
            "fields":
            {
                "Study Design Type": "type",
                "Study Design Type Term Accession Number": "type_accession",
                "Study Design Type Term Source REF": "type_source"
            },
            "references":
            {
                "current_study": "study"
            }
        },
        "STUDY FACTORS":
        {
            "model": Factor,
            "fields":
            {
                "Study Factor Name": "name",
                "Study Factor Type": "type",
                "Study Factor Type Term Accession Number": "type_accession",
                "Study Factor Type Term Source REF": "type_source"
            },
            "references":
            {
                "current_study": "study"
            }
        },
        "STUDY ASSAYS":
        {
            "model": Assay,
            "fields":
            {
                "Study Assay Measurement Type": "measurement",
                "Study Assay Measurement Type Term Accession Number":
                    "measurement_accession",
                "Study Assay Measurement Type Term Source REF":
                    "measurement_source",
                "Study Assay Technology Type": "technology",
                "Study Assay Technology Type Term Accession Number":
                    "technology",
                "Study Assay Technology Type Term Source REF":
                    "technology_source",
                "Study Assay Technology Platform": "platform",
                "Study Assay File Name": "file_name",
            },
            "references":
            {
                "current_study": "study"
            }
        },
        "STUDY PROTOCOLS":
        {
            "model": Protocol,
            "fields":
            {
                "Study Protocol Name": "name",
                "Study Protocol Type": "type",
                "Study Protocol Type Term Accession Number": "type_accession",
                "Study Protocol Type Term Source REF": "type_source",
                "Study Protocol Description": "description",
                "Study Protocol URI": "uri",
                "Study Protocol Version": "version",
                # "Study Protocol Parameters Name": "parameter_name",
                # TODO: should this be "Study Protocol Parameters Name
                #  Accession Number"???
                # "Study Protocol Parameters Name Term Accession Number":
                #   "name_accession",
                # TODO: should this be "Study Protocol Parameters Name Source
                # REF"???
                # "Study Protocol Parameters Name Term Source REF":
                #   "name_source",
                # "Study Protocol Components Name": "component_name",
                # "Study Protocol Components Type": "component_type",
                # "Study Protocol Components Type Term Accession Number":
                #   "type_accession",
                # "Study Protocol Components Type Term Source REF":
                #   "type_source",
            },
            "references":
            {
                "current_study": "study"
            }
        }
    }

    def __init__(self, file_source_translator,
                 additional_raw_data_file_extension=None):
        self.file_source_translator = file_source_translator
        # TODO: remove this temporary fix to deal with ISA-Tab from
        # ArrayExpress (see also _parse_node)
        self.additional_raw_data_file_extension = \
            additional_raw_data_file_extension
        # parser flags/settings
        self.ignore_case = True
        self.ignore_missing_protocols = True
        # internals
        self._current_investigation = None
        self._current_study = None
        self._current_assay = None
        self._current_node = None
        self._previous_node = None
        self._current_attribute = None
        self._current_protocol_reference = None
        self._current_reader = None
        self._current_file = None
        self._current_file_name = None

    def _split_header(self, header):
        return [x.strip() for x in header.replace("]", "").strip().split("[")]

    def _parse_node(self, headers, row):
        """row is a deque, column header is at position len(headers) - len(row)
        """
        # TODO: test if this is really a node
        header_components = self._split_header(headers[-len(row)])
        # TODO: for a node the number of header components must be 1
        # assert(len(header_components)) == 1

        # try to retrieve this node from the database (unless it is a
        # normalization or data transformation)
        is_new = True

        # name of the node
        node_name = row[0].strip()

        # TODO: remove this once it has been implemented in the preprocessing
        if (header_components[0] == Node.RAW_DATA_FILE and
                self.additional_raw_data_file_extension is not None and
                len(node_name) > 0):
            if not re.search(
                    r'%s$' % self.additional_raw_data_file_extension,
                    node_name):
                node_name += self.additional_raw_data_file_extension

        if (header_components[0] in Node.ASSAYS |
            {Node.SAMPLE, Node.SOURCE, Node.EXTRACT, Node.LABELED_EXTRACT,
             Node.DATA_TRANSFORMATION, Node.NORMALIZATION} and
                len(node_name) > 0) or \
                (header_components[0] in Node.FILES and len(node_name) > 0):
            if header_components[0] in {Node.SAMPLE, Node.SOURCE}:
                node, is_new = Node.objects.get_or_create(
                    study=self._current_study,
                    type=header_components[0],
                    name=node_name)
            else:
                node, is_new = Node.objects.get_or_create(
                    study=self._current_study,
                    assay=self._current_assay,
                    type=header_components[0],
                    name=node_name)
            # this node represents a file - add the file to the file store and
            # store the file UUID in the node
            if (is_new and
                    header_components[0] in Node.FILES and
                    node_name is not ""):
                # create the nodes for the data file in this row
                file_path = self.file_source_translator(node_name)
                file_store_item = FileStoreItem.objects.create(
                    source=file_path
                )
                if file_store_item:
                    node.file_uuid = file_store_item.uuid
                    node.save()
                else:
                    raise ParserException(
                        "Unable to add {} to file store as a temporary file."
                        .format(file_path)
                    )
            if is_new:
                logger.info("New node %s created", str(node))
            else:
                logger.info("Node %s retrieved", str(node))
        else:
            if len(node_name) > 0:
                node = Node.objects.create(
                    study=self._current_study,
                    assay=self._current_assay,
                    type=header_components[0],
                    name=node_name)
            else:
                # do not create empty nodes!
                node = None

        self._current_node = node

        if self._previous_node is not None and self._current_node is not None:
            try:
                # test if the node has already been created (??? why not use an
                # if statement ???)
                node.parents.get(to_node_id=self._previous_node.id)
            except:
                self._previous_node.children.add(node)
                node.parents.add(self._previous_node)
                node.save()
                self._previous_node.save()
        else:
            # TODO: look up parent nodes in DB
            pass

        # remove the node from the row
        row.popleft()

        # read until we hit the next node
        while len(row) > 0 and not self.is_node(headers[-len(row)]):
            if self._current_node is not None:
                if self.is_attribute(headers[-len(row)]):
                    self._parse_attribute(headers, row)
                elif self.is_protocol_reference(headers[-len(row)]):
                    self._parse_protocol_reference(headers, row)
                else:
                    logger.warning(
                        "Unexpected element `" + headers[-len(row)] + "` when "
                        "parsing node in line " +
                        str(self._current_reader.line_num) + ", column " +
                        str(len(headers) - len(row)) + ".")
                    row.popleft()
            else:
                # node is none, pop until the next node because attributes
                # can't be attached to anything
                row.popleft()
        if self._current_node is not None:
            node.save()
            self._previous_node = node
            self._current_node = None

        return node

    def _parse_attribute(self, headers, row):
        """row is a deque, column header is at position len(headers) - len(row)
        """
        # TODO: test if this is really an attribute
        header_components = self._split_header(headers[-len(row)])

        # TODO: for an attribute the number of header components must be 1 or 2
        # or 3 (for the "order" case, see ISA-Tab Spec 5.4.2)
        # assert(len(header_components)) > 0 and <= 3

        # TODO: do we need to test if this attribute type + subtype combination
        # exists already for this study?

        # test if the current node already has an attribute with these
        # properties
        has_attribute = False

        if len(header_components) > 1:
            if self._current_node.attribute_set.filter(
                    type=header_components[0],
                    value=row[0],
                    subtype=header_components[1]
            ).count() > 0:
                has_attribute = True
        else:
            if self._current_node.attribute_set.filter(
                    type=header_components[0],
                    value=row[0]
            ).count() > 0:
                has_attribute = True
        # add attribute if it does not exist yet
        if not has_attribute:
            attribute = Attribute.objects.create(node=self._current_node)
            attribute.study = self._current_study
            attribute.type = header_components[0]
            attribute.value = row[0]

            if len(header_components) > 1:
                attribute.subtype = header_components[1]

            # TODO: deal with the "order" case (see ISA-Tab Spec 5.4.2)

        # remove the attribute from the row
        row.popleft()

        if self.is_term_information(headers[-len(row)]):
            if not has_attribute:
                term_information = self._parse_term_information(headers, row)
                attribute.value_accession = term_information["accession"]
                attribute.value_source = term_information["source"]
            else:
                row.popleft()
                row.popleft()

        if self.is_unit(headers[-len(row)]):
            if not has_attribute:
                unit_information = self._parse_unit_information(headers, row)
                attribute.value_unit = unit_information["unit"]
                attribute.value_accession = unit_information["accession"]
                attribute.value_source = unit_information["source"]
            else:
                row.popleft()
                if (len(row) > 1 and
                        self.is_term_information(headers[-len(row) + 1])):
                    row.popleft()
                    row.popleft()

        if not has_attribute:
            # done
            attribute.save()
            return attribute

        # remove the attribute from the row
        return None

    def _parse_protocol_reference(self, headers, row):

        if self.is_protocol_reference(headers[-len(row)]):

            try:
                protocol = self._current_study.protocol_set.get(name=row[0])
                # if protocol is None:
            except:
                if self.ignore_missing_protocols:
                    protocol, is_created = Protocol.objects.get_or_create(
                        name=row[0],
                        study=self._current_study)
                    logger.info(
                        "Undeclared protocol " + row[0] + " when parsing term "
                        "protocol in line " +
                        str(self._current_reader.line_num) + ", column " +
                        str(len(headers) - len(row)) + "." + " This protocol "
                        "was created since the parser is being run with "
                        "ignore_missing_protocols = True.")
                else:
                    raise ParserException(
                        "Undeclared protocol {} when parsing term "
                        "protocol in line {}, column {}. An attempt to "
                        "create this protocol failed.".format(
                            row[0],
                            self._current_reader.line_num,
                            len(headers) - len(row)
                        )
                    )

            protocol_reference = ProtocolReference.objects.create(
                node=self._current_node,
                protocol=protocol)
            self._current_protocol_reference = protocol_reference

            row.popleft()

            while self.is_protocol_reference_information(headers[-len(row)]):
                # TODO: handle comments
                if self.is_protocol_reference_parameter(headers[-len(row)]):
                    self._parse_protocol_reference_parameter(headers, row)
                elif self.is_protocol_reference_performer(headers[-len(row)]):
                    protocol_reference.performer = row[0]
                    row.popleft()
                    # TODO: lookup performer uuid from user database
                elif self.is_protocol_reference_date(headers[-len(row)]):
                    protocol_reference.date = row[0]
                    row.popleft()
                    # TODO: lookup performer uuid from user database
                else:
                    pass

            protocol_reference.save()
            return protocol_reference

    def _parse_protocol_reference_parameter(self, headers, row):
        header_components = self._split_header(headers[-len(row)])

        # TODO: for a protocol reference parameter the number of header
        # components must be 2 or 3 (for the "order" case, see
        # ISA-Tab Spec 5.4.2)
        # assert(len(header_components)) > 1 and <= 3

        parameter = ProtocolReferenceParameter.objects.create(
            protocol_reference=self._current_protocol_reference)
        parameter.name = header_components[1]
        parameter.value = row[0]

        # TODO: deal with the "order" case (see ISA-Tab Spec 5.4.2)

        # remove the attribute from the row
        row.popleft()

        if self.is_term_information(headers[-len(row)]):
            term_information = self._parse_term_information(headers, row)
            parameter.value_accession = term_information["accession"]
            parameter.value_source = term_information["source"]
        if self.is_unit(headers[-len(row)]):
            unit_information = self._parse_unit_information(headers, row)
            parameter.value_unit = unit_information["unit"]
            parameter.value_accession = unit_information["accession"]
            parameter.value_source = unit_information["source"]
        # done
        parameter.save()
        return parameter

    def _parse_term_information(self, headers, row):
        """Parses a term_accession, term_source pair
        Currently does not enforce any specific order.
        """
        # parse the first component (if strict, this should be the accession
        # number)
        if self.is_term_accession(headers[-len(row)]):
            accession = row[0]
            row.popleft()
            # parse the second component (if strict, this should be the
            # ontology reference)
            if self.is_term_source(headers[-len(row)]):
                source = row[0]
                row.popleft()
                return {"accession": accession, "source": source}
            else:
                raise ParserException(
                    "Unexpected element {} when "
                    "parsing term information in line {} , column {}.".format(
                        headers[-len(row)],
                        self._current_reader.line_num,
                        len(headers) - len(row)
                    )
                )
        elif self.is_term_source(headers[-len(row)]):
            source = row[0]
            row.popleft()
            # parse the second component (if strict, this should be the
            # ontology reference)
            if self.is_term_accession(headers[-len(row)]):
                accession = row[0]
                row.popleft()
                return {"accession": accession, "source": source}
            else:
                raise ParserException(
                    "Unexpected element {} when "
                    "parsing term information in line {} , column {}.".format(
                        headers[-len(row)],
                        self._current_reader.line_num,
                        len(headers) - len(row)
                    )
                )
        else:
            raise ParserException(
                "Unexpected element {} when "
                "parsing term information in line {} , column {}.".format(
                    headers[-len(row)],
                    self._current_reader.line_num,
                    len(headers) - len(row)
                )
            )

    def _parse_unit_information(self, headers, row):
        """Parses a term_accession, term_source pair
        Currently does not enforce any specific order.
        """
        # parse the first component (unit name)
        if self.is_unit(headers[-len(row)]):
            unit = row[0]
            row.popleft()
        else:
            raise ParserException(
                "Unexpected element {} when "
                "parsing unit information in line {} , column {}.".format(
                    headers[-len(row)],
                    self._current_reader.line_num,
                    len(headers) - len(row)
                )
            )
        # parse term information if available
        if self.is_term_information(headers[-len(row)]):
            term_information = self._parse_term_information(headers, row)
        else:
            term_information = {}
            term_information["accession"] = None
            term_information["source"] = None
        return {
            "unit": unit,
            "accession": term_information["accession"],
            "source": term_information["source"]
        }

    def _parse_assay_file(self, study, assay, file_name):
        self._current_file_name = file_name
        self._current_assay = assay
        self._parse_study_file(study, file_name)

    def _parse_study_file(self, study, file_name):
        self._current_file_name = file_name
        self._current_study = study
        self._current_file = open(file_name, "rU")
        self._current_reader = csv.reader(self._current_file,
                                          dialect="excel-tab")
        # read column headers
        headers = []
        headers = self._current_reader.next()

        try:
            headers.remove("")
        except:
            pass

        # TODO: check if all factor values used in this file have been declared

        for row in self._current_reader:

            row = deque(row)
            self._previous_node = None

            while len(row) > 0:
                self._current_node = None
                self._parse_node(headers, row)

    def _create_investigation_file_section_model(self, section_title, fields):
        try:
            section = self.SECTIONS[section_title]
        except:
            logger.warning(
                "Trying to obtain details for undefined section " +
                str(section_title) + " when parsing " +
                self._current_file_name + ".")
            return None
        # 1. determine length of field with most number of columns
        columns = -1
        for key in fields:
            if columns < len(fields[key]):
                columns = len(fields[key])
        # 2. pad all field arrays to have the length of the longest field array
        # in many cases all fields will have the same length, but only if the
        # author put in enough tabs in all columns
        for key in fields:
            fields[key] += [""] * (columns - len(fields[key]))

        # 3. get the model
        model_class = section["model"]

        # 4. iterate over all columns in this section
        for column in range(0, columns):
            model_parameters = {}

            # create model parameter dictionary for all entries in this section
            for field_name in fields:
                parameter_name = self._adjust_dict_case(
                    section["fields"])[self._adjust_string_case(field_name)]
                model_parameters[parameter_name] = fields[field_name][column]
            # test if any field has a non-empty string in it
            if len([fields[key][column]
                    for key in fields
                    if fields[key][column].strip() != ""]) == 0:
                logger.info(
                    "Column " + str(column) + " in section " + section_title +
                    " has no non-empty cells and was ignored.")
                # for all section but INVESTIGATION and STUDY continue)
                if not (section_title == "INVESTIGATION" and
                        self._current_investigation is None) or (
                            section_title == "STUDY" and
                            self._current_study is None):
                    continue
            # if necessary enrich model parameters with required foreign key
            # references
            if "references" in section:
                for reference_name in section["references"]:
                    parameter_name = section["references"][reference_name]
                    if reference_name == "current_investigation":
                        model_parameters[parameter_name] = \
                            self._current_investigation
                    elif reference_name == "current_study":
                        model_parameters[parameter_name] = self._current_study
                    else:
                        pass
                        # TODO: log error referring to unknown reference_name
            # create model
            if section_title != "ONTOLOGY SOURCE REFERENCE":
                model_instance = model_class.objects.create(**model_parameters)
                model_instance.save()
                if section_title == "INVESTIGATION":
                    self._current_investigation = model_instance
                if section_title == "STUDY":
                    self._current_study = model_instance
        # create an investigation even if no information is provided
        # (all fields empty, no tab after any field name)
        if columns == 0:
            if section_title == "INVESTIGATION":
                model_instance = Investigation.objects.create()
                self._current_investigation = model_instance

    # parse an investigation section
    def _parse_investigation_file_section(self, section_title):
        try:
            section = self.SECTIONS[section_title]
            fields = {}
        except:
            logger.warning(
                "Trying to obtain details for undefined section " +
                str(section_title) + " when parsing " +
                self._current_file_name + ".")
            return None
        while True:
            # 1. try to read the next line from the file
            try:
                start_position = self._current_file.tell()
                line = (
                    self._current_file.readline()
                    .decode("utf-8", "replace")
                    .rstrip("\n")
                )
                end_position = self._current_file.tell()

                if end_position - start_position == 0:
                    # the EOF was found, stop reading and create model for
                    # section
                    self._create_investigation_file_section_model(
                        section_title,
                        fields
                    )
                    return None
            except:
                return None
            # 2. skip empty lines (ignoring all whitespace characters)
            if len(line.strip()) == 0:
                continue
            # 3. split line on tab
            columns = line.split("\t")
            # 4. identify row type
            if (self._adjust_string_case(columns[0].strip()) in
                    self._adjust_list_case(self.SECTIONS)):
                # the next section title was found, stop reading and create
                # model for section
                self._create_investigation_file_section_model(
                    section_title,
                    fields
                )
                # return the next section title
                return columns[0].strip()
            elif self._adjust_string_case(columns[0].strip()) in \
                    self._adjust_list_case(section["fields"]):
                # a section field was found, split row, trim white space and
                # save in field dictionary
                field_name = columns[0].strip()
                # TODO: should we check for multiple instances of the same
                # field? right now the last instance counts

                # test if last column is the start of a multiline field
                if not self.is_multiline_start(columns[-1]):
                    fields[field_name] = [column.strip(" \"").replace(
                        "\"\"\"", "\"") for column in columns[1:]]
                else:
                    fields[field_name] = [column.strip(" \"").replace(
                        "\"\"\"", "\"") for column in columns[1:-1]]
                    # deal with multi line field: read lines and split on tab
                    # until the first field is the end of a multiline field
                    while (len(columns) >= 1 and
                           self.is_multiline_start(columns[-1])):
                        multiline_field = columns[-1]
                        multiline_field_remainder, columns = \
                            self._parse_investigation_multiline_field()
                        multiline_field += multiline_field_remainder

                        fields[field_name].append(
                            multiline_field.strip()
                                           .strip("\"")
                                           .replace("\"\"\"", "\"")
                        )
                        # merge remaining columns from this line with previous
                        # columns (ignore last if is the start of a multiline
                        # field
                        if len(columns) >= 1:
                            fields[field_name] = (
                                list(
                                    itertools.chain.from_iterable(
                                        [fields[field_name],
                                         [column.strip().strip("\"").replace(
                                             "\"\"\"", "\"")
                                          for column in columns[:-1]]])))
                            if not self.is_multiline_start(columns[-1]):
                                fields[field_name].append(
                                    columns[-1].strip()
                                    .strip("\"")
                                    .replace("\"\"\"", "\""))
            else:
                # undefined field, ignore
                logger.warning(
                    "Undefined field " + str(columns[0]) +
                    " found in column 1 when parsing \"" +
                    section_title + "\" from " + self._current_file_name + ".")

    # returns lines 2-n of the multiline field (concatenated) and the remaining
    # columns in line n
    def _parse_investigation_multiline_field(self):
        multiline_field = ""
        while True:
            try:
                start_position = self._current_file.tell()
                line = (
                    self._current_file.readline()
                    .decode("utf-8", "replace")
                    .rstrip("\n")
                )
                end_position = self._current_file.tell()

                if end_position - start_position == 0:
                    # EOF reached
                    return None
            except:
                raise ParserException(
                    "End of file reached in multiline field in " +
                    self._current_file_name + "."
                )

            multiline_columns = line.split("\t")
            if not self.is_multiline_end(multiline_columns[0]):
                multiline_field += "\n" + line
            else:
                multiline_field += "\n" + multiline_columns[0]
                return multiline_field, multiline_columns[1:]

    def _parse_investigation_file(self, file_name):

        self._current_file_name = file_name
        self._current_file = open(file_name, "rU")

        section_title = None

        # read lines from the file until a section title is found
        while True:
            # 1. try to read the next line from the file
            try:
                start_position = self._current_file.tell()
                line = (
                    self._current_file.readline()
                    .decode("utf-8", "replace")
                    .rstrip("\n")
                )
                end_position = self._current_file.tell()

                if end_position - start_position == 0:
                    # EOF reached
                    return None

            except:
                return None

            # 2. skip empty lines (ignoring all whitespace characters)
            if len(line.strip()) == 0:
                continue

            # 3. split line on tab
            columns = line.split("\t")

            # 4. identify row type
            if columns[0].strip() in self.SECTIONS:
                # a section title was found, stop reading
                # TODO: can we push this line back? or peek?
                section_title = columns[0].strip()
                break
            else:
                # undefined field, ignore
                logger.warning(
                    "Field " + str(columns[0].strip()) + " found in column 1 "
                    "before section when parsing " +
                    self._current_file_name + "."
                )

        # parse the sections
        while True:
            section_title = \
                self._parse_investigation_file_section(section_title)

            if section_title is None:
                return

    def run(self, path, isa_archive=None, preisa_archive=None):
        """If path is a file it will be treated as an ISArchive, if it is a
        directory it will be treated as an extracted ISArchive. Assumes that
        the archive extracts into a subdirectory named <archive> if the
        ISArchive is called <archive>.zip.
        """
        # 1. test if archive needs to be extracted and extract if necessary
        if not os.path.isdir(path):
            # assign to isa_archive if it's an archive anyway
            isa_archive = path
            logger.info(
                "Supplied path \"" + path + "\" is not a directory. Assuming "
                "ISArchive file.")
            try:
                # TODO: do we need a random subdirectory here?
                extract_path = tempfile.mkdtemp()
                with ZipFile(path, 'r') as zip:
                    # test if any paths are relative or absolute and outside
                    # the extract path
                    for name in zip.namelist():
                        if name.startswith("..") or name.startswith("/"):
                            raise ParserException(
                                "Unable to extract assumed ISArchive "
                                "file {!r} due to illegal file path: {}"
                                .format(path, name)
                            )
                    # extract archive
                    zip.extractall(extract_path)
                    first_file = zip.namelist()[0]
                    # test if first entry in zip file is a path
                    if first_file.endswith("/"):
                        # add archive subdirectory to path
                        extract_path = os.path.join(extract_path, first_file)
                    elif re.search(r'/', first_file):
                        ind = string.find(first_file, '/')
                        extract_path = os.path.join(
                            extract_path,
                            first_file[:ind]
                        )

                    logger.info(
                        "ISArchive extracted to \"" + extract_path + "\"."
                    )
                    path = extract_path
            except:
                raise ParserException(
                    "Unable to extract assumed ISArchive file {!r}."
                    .format(path)
                )
        # 2. identify investigation file
        try:
            investigation_file_name = glob.glob("%s/i*.txt" % path).pop()
        except IndexError as exception:
            raise ParserException(
                "Unable to identify ISArchive file in {!r} {}.".format(
                    path,
                    exception
                )
            )
        # 3. parse investigation file and identify study files and
        # corresponding assay files
        self._parse_investigation_file(investigation_file_name)
        # 4. parse all study files and corresponding assay files
        if self._current_investigation is not None:
            # identify studies associated with this investigation
            for study in self._current_investigation.study_set.all():
                # parse study file
                self._current_assay = None
                study_file_name = os.path.join(path, study.file_name)
                if fix_last_column(study_file_name):
                    self._parse_study_file(study, study_file_name)
                    for assay in study.assay_set.all():
                        # parse assay file
                        self._previous_node = None
                        assay_file_name = os.path.join(path, assay.file_name)
                        if fix_last_column(assay_file_name):
                            self._parse_assay_file(study, assay,
                                                   assay_file_name)
        else:
            raise ParserException(
                "No investigation was identified when parsing investigation "
                "file \"" + investigation_file_name + "\""
            )
        # 5. assign ISA-Tab archive and pre-ISA-Tab archive if present
        if isa_archive:
            file_store_item = FileStoreItem.objects.create(source=isa_archive)
            self._current_investigation.isarchive_file = file_store_item.uuid
            import_file(self._current_investigation.isarchive_file,
                        refresh=True)

        if preisa_archive:
            file_store_item = \
                FileStoreItem.objects.create(source=preisa_archive)
            self._current_investigation.pre_isarchive_file = \
                file_store_item.uuid
            import_file(self._current_investigation.pre_isarchive_file,
                        refresh=True)

        self._current_investigation.save()
        return self._current_investigation

    # Utility Functions
    def is_multiline_start(self, string):
        start_quote = False
        end_quote = False

        if string.startswith("\"") and not string.startswith("\"\"\""):
            start_quote = True
        if string.endswith("\"") and not string.endswith("\"\"\""):
            end_quote = True

        # line that only contains a quote
        if len(string.strip()) == 1 and (start_quote or end_quote):
            return True

        return start_quote and (start_quote and not end_quote)

    def is_multiline_end(self, string):
        start_quote = False
        end_quote = False

        if string.startswith("\"") and not string.startswith("\"\"\""):
            start_quote = True
        if string.endswith("\"") and not string.endswith("\"\"\""):
            end_quote = True

        # line that only contains a quote
        if len(string) == 1 and (start_quote or end_quote):
            return True

        return end_quote and (end_quote and not start_quote)

    def is_node(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) in \
            self._adjust_list_case(Node.TYPES)

    def is_attribute(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) in \
            self._adjust_list_case(Attribute.TYPES)

    def is_protocol_reference(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Protocol REF")

    def is_protocol_reference_parameter(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Parameter Value")

    def is_protocol_reference_performer(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Performer")

    def is_protocol_reference_date(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Date")

    def is_protocol_reference_information(self, string):
        return self.is_protocol_reference_date(string) or \
            self.is_protocol_reference_performer(string) or \
            self.is_protocol_reference_parameter(string)

    def is_unit(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Unit")

    def is_term_accession(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Term Accession Number")

    def is_term_source(self, string):
        return self._adjust_string_case(string.split("[")[0].strip()) == \
            self._adjust_string_case("Term Source REF")

    def is_term_information(self, string):
        return self.is_term_accession(string) or self.is_term_source(string)

    def get_dataset_name(self, path):
        if not os.path.isdir(path):
            logger.info(
                "Supplied path \"" + path + "\" is not a directory. Assuming "
                "ISArchive file.")
            try:
                # TODO: do we need a random subdirectory here?
                extract_path = tempfile.mkdtemp()
                with ZipFile(path, 'r') as zip:
                    # test if any paths are relative or absolute and outside
                    # the extract path
                    for name in zip.namelist():
                        if name.startswith("..") or name.startswith("/"):
                            raise ParserException(
                                "Unable to extract assumed ISArchive "
                                "file {!r} due to illegal file path: {!r}"
                                .format(path, name)
                            )
                    # extract archive
                    zip.extractall(extract_path)

                    first_file = zip.namelist()[0]
                    # test if first entry in zip file is a path
                    if first_file.endswith("/"):
                        # add archive subdirectory to path
                        extract_path = os.path.join(extract_path, first_file)
                    elif re.search(r'/', first_file):
                        ind = string.find(first_file, '/')
                        extract_path = os.path.join(
                            extract_path,
                            first_file[:ind]
                        )

                    logger.info(
                        "ISArchive extracted to \"" + extract_path + "\"."
                    )
                    path = extract_path
            except:
                raise ParserException(
                    "Unable to extract assumed ISArchive file {!r}."
                    .format(path)
                )

        # 2. identify investigation file
        try:
            investigation_file_name = glob.glob("%s/i*.txt" % path).pop()
        except IndexError:
            raise ParserException(
                "Unable to identify ISArchive file in {!r}.".format(path)
            )

        logger.info("Investigation file path: %s", investigation_file_name)

        identifier = None
        study_id = True
        investigation_id = True
        study_title = True
        investigation_title = True
        title = None

        with open(investigation_file_name, 'r') as f:
            for line in f:
                line = line.strip('\n')
                if not identifier and \
                   investigation_id and \
                   line.startswith("Investigation Identifier"):
                    try:
                        identifier = line.split('\t')[1].strip(' "')
                    except IndexError:
                        pass
                    investigation_id = False
                if not identifier and \
                   not investigation_id and \
                   study_id and \
                   line.startswith("Study Identifier"):
                    try:
                        identifier = line.split('\t')[1].strip(' "')
                    except IndexError:
                        pass
                    study_id = False
                if not title and \
                   investigation_title and \
                   line.startswith("Investigation Title"):
                    try:
                        title = line.split('\t')[1].strip(' "')
                    except IndexError:
                        pass
                    investigation_title = False
                if not title and \
                   not investigation_title and \
                   line.startswith("Study Title"):
                    try:
                        title = line.split('\t')[1].strip(' "')
                    except IndexError:
                        pass
                    study_title = False
                if ((identifier and title) or
                    (not (
                        study_id or
                        study_title or
                        investigation_id or
                        investigation_title))):
                    return (identifier, title)
        return (None, None)

    def _adjust_string_case(self, string):
        """Returns a lowercase copy of string if the parser has
        ignore_case set to True, otherwise string will be returned.
        """
        if self.ignore_case:
            return string.lower()
        return string

    def _adjust_list_case(self, list):
        """Returns a copy of list with all lowercase entries if the parser has
        ignore_case set to True, otherwise list will be returned.
        """
        if self.ignore_case:
            return [s.lower() for s in list]
        return list

    def _adjust_dict_case(self, dict):
        """Returns a copy of dict with all lowercase keys if the parser has
        ignore_case set to True, otherwise dict will be returned. Use
        with _adjust_string_case to do a case insensitive lookup
        """
        if self.ignore_case:
            return {k.lower(): dict[k] for k in dict}
        return dict
