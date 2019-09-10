'''
Created on May 29, 2012

@author: nils
'''
import copy
import csv
import hashlib
import json
import logging
import shutil
import tempfile
import time
import urlparse

from django.conf import settings
from django.db.models import Q
from django.utils.http import urlquote, urlunquote

import requests

import constants
import core

from .models import (
    AnnotatedNode, AnnotatedNodeRegistry, Assay, Attribute, AttributeOrder,
    Node, Study
)
from .search_indexes import NodeIndex
from .serializers import AttributeOrderSerializer

logger = logging.getLogger(__name__)

# number of AnnotatedNode objects that can be inserted with bulk insert
# (limitation of sqlite)
# https://docs.djangoproject.com/en/dev/ref/models/querysets/#django.db.models.query.QuerySet.bulk_create
MAX_BULK_LIST_SIZE = 75


# make a list of values unique
def uniquify(seq):
    set = {}
    map(set.__setitem__, seq, [])
    return set.keys()


# for an assay declaration (= assay file in a study)
# this method is based on the assumption that all paths through the experiment
# graph follow the same sequence of node types
def get_node_types(study_uuid, assay_uuid=None, files_only=False,
                   filter_set=None):
    """filter_set is a set of node types, e.g. ["Sample Name", "Source Name"].
    Sets defined in Node (e.g. Node.ASSAYS, Node.FILES) can be applied. The
    method will only return node types included in filter_set unless filter_set
    is "None".
    The order of the returned list is the order of the node types in the
    experiment graph.
    """
    try:
        # 1. find a node without children
        nodes = Node.objects.filter(study__uuid=study_uuid,
                                    assay__uuid=assay_uuid)

        for n in nodes:
            if n.children_set.count() == 0:
                node = n
                break

        # 2. recursively follow until reaching a source node
        sequence = _get_node_types_recursion(node)
        sequence.reverse()

        if filter_set is None:
            return sequence
        else:
            return [item for item in sequence if item in filter_set]
    except:
        return None


def _get_node_types_recursion(node):
    sequence = [node.type]
    # 1. get the first child (the assumption is that all node type sequences
    # are the same)
    try:
        parent = node.parents.all()[0]
        sequence.extend(_get_node_types_recursion(parent))
    except:
        pass

    return sequence


def _get_unique_parent_attributes(nodes, node_id):
    """Recursively collects attributes from the current node and each parent
    node until no more parents are available and make sure that the final list
    of attributes is unique.
    """
    attributes = {}

    if len(nodes[node_id]["parents"]) == 0:
        for attr in nodes[node_id]["attributes"]:
            attributes[attr[0]] = attr

        return attributes

    for parent_id in nodes[node_id]["parents"]:
        attributes.update(_get_unique_parent_attributes(nodes, parent_id))

    for attr in nodes[node_id]["attributes"]:
        attributes[attr[0]] = attr

    return attributes


def _retrieve_nodes(study_uuid, assay_uuid=None,
                    ontology_attribute_fields=False, node_uuids=None):
    """Retrieve all nodes associated to a study and optionally associated to an
    assay.
    If `node_uuids` is `None` query nodes (both from assay and from study only)
    """
    filters = {}
    q_filters = []

    if node_uuids is not None:
        filters['uuid__in'] = node_uuids
    else:
        q_filters_1 = Q(study__uuid=study_uuid, assay__uuid__isnull=True)
        if assay_uuid is not None:
            q_filters_1 = (
                q_filters_1 | Q(study__uuid=study_uuid, assay__uuid=assay_uuid)
            )
        q_filters.append(q_filters_1)

    # Query for notes
    node_list = Node.objects.filter(*q_filters, **filters)\
        .prefetch_related('attribute_set', 'file_item')\
        .order_by('id', 'attribute').values('id', 'uuid', 'file_item__uuid',
                                            'type', 'name', 'parents',
                                            'attribute')
    if ontology_attribute_fields:
        attribute_fields = Attribute.ALL_FIELDS
    else:
        attribute_fields = Attribute.NON_ONTOLOGY_FIELDS

    attribute_list = Attribute.objects.filter().order_by('id').\
        values_list(*attribute_fields)

    attributes = {}
    current_id = None
    current_node = None
    nodes = {}

    for attribute in attribute_list:
        attributes[attribute[0]] = attribute

    for node in node_list:
        if current_id is None or current_id != node["id"]:
            # save current node
            if current_node is not None:
                current_node['parents'] = uniquify(current_node['parents'])
                nodes[current_id] = current_node
            # new node, start merging
            current_id = node['id']
            current_node = {
                'id': node['id'],
                'uuid': node['uuid'],
                'attributes': [],
                'parents': [],
                'name': node['name'],
                'type': node['type'],
                'file_uuid': node['file_item__uuid']
            }

        # Fritz: Do the parents really differ or is this overhead?
        if node['parents'] is not None:
            current_node['parents'].append(node['parents'])

        if node['attribute'] is not None:
            try:
                current_node['attributes'].append(
                    attributes[node['attribute']]
                )
            except:
                pass

    # save last node
    if current_node is not None:
        current_node['parents'] = uniquify(current_node['parents'])
        nodes[current_id] = current_node

    return nodes


def _create_annotated_node_objs(bulk_list=[], node=None, study=None,
                                assay=None, attrs=None):
    """Helper method to bulk create annotated nodes"""
    counter = 0
    if (node is not None and study is not None and assay is not None and
            attrs is not None):
        for attr_key in attrs:
            counter += 1
            bulk_list.append(
                AnnotatedNode(node_id=node['id'],
                              attribute_id=attrs[attr_key][0],
                              study=study, assay=assay, node_uuid=node['uuid'],
                              node_file_uuid=node['file_uuid'],
                              node_type=node['type'], node_name=node['name'],
                              attribute_type=attrs[attr_key][1],
                              attribute_subtype=attrs[attr_key][2],
                              attribute_value=attrs[attr_key][3],
                              attribute_value_unit=attrs[attr_key][4])
            )
            if len(bulk_list) == MAX_BULK_LIST_SIZE:
                AnnotatedNode.objects.bulk_create(bulk_list)
                # Reset list
                bulk_list = []
    elif len(bulk_list) > 0:
        # Create remaining annotated nodes
        AnnotatedNode.objects.bulk_create(bulk_list)

    return bulk_list, counter


def update_annotated_nodes(
        node_type,
        study_uuid,
        assay_uuid=None,
        update=False):
    # Retrieve first study and assay ids
    try:
        study = Study.objects.get(uuid=study_uuid)
    # NameError will be raised later
    except (Study.DoesNotExist,
            Study.MultipleObjectsReturned) as e:
        logger.error(
            "Couldn't fetch Study %s: %s", str(study_uuid), e
        )

    if assay_uuid is not None:
        try:
            assay = Assay.objects.get(uuid=assay_uuid)
        # NameError will be raised later
        except (Assay.DoesNotExist,
                Assay.MultipleObjectsReturned) as e:
            logger.error(
                "Couldn't fetch Assay %s: %s", str(assay_uuid), e
            )
    else:
        assay = None

    # Check if this combination of node_type, study_uuid and assay_uuid already
    # exists
    if assay is None:
        registry, created = AnnotatedNodeRegistry.objects.get_or_create(
            study_id=study.id, assay__isnull=True, node_type=node_type)
    else:
        registry, created = AnnotatedNodeRegistry.objects.get_or_create(
            study_id=study.id, assay_id=assay.id, node_type=node_type)

    # Update registry entry
    registry.save()
    if not created and not update:
        # registry entry exists and no updating requested
        return

    # Remove existing annotated node objects for this node_type in this
    # study/assay
    if assay_uuid is None:
        AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True),
            node_type=node_type).delete()
    else:
        AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
            Q(study__uuid=study_uuid, assay__uuid=assay_uuid),
            node_type=node_type).delete()

    # Retrieve _all_ annotated nodes associated to the given study and assay
    nodes = _retrieve_nodes(study_uuid, assay_uuid, True)

    # Start timer
    start = time.time()

    # Holds AnnotatedNodes objects for bulk db entry creation
    bulk_list = []

    # Total number of associated nodes of the given node type.
    num_nodes_of_type = 0

    # Sum of attributes of all `num_nodes_of_type`
    total_attrs = 0

    # Total number of unique attributes of `num_nodes`
    total_unique_attrs = 0

    # To avoid exponential node creation, count the number of nodes to be
    # created first.
    for node_id, node in nodes.iteritems():
        total_unique_attrs += len(
            nodes[node_id]["attributes"]
        )
        if node["type"] == node_type:
            num_nodes_of_type += 1
            attrs = _get_unique_parent_attributes(nodes, node_id)
            u_len = len(attrs)
            total_attrs += u_len
    if total_attrs == total_unique_attrs * num_nodes_of_type \
            and len([
                n for n in nodes.values() if n['type'] == 'Sample Name'
            ]) > 1:
        # This should exclude CSV imports
        # TODO: Not happy about this hack at all.
        error_message = (
            "Exponential explosion! Creation of {} annotated nodes for {} "
            "nodes of type {}"
        ).format(total_attrs, num_nodes_of_type, node_type)

        logger.error(error_message)

    for node_id, node in nodes.iteritems():
        if node["type"] == node_type:
            bulk_list, counter = _create_annotated_node_objs(
                bulk_list,
                node,
                study,
                assay,
                _get_unique_parent_attributes(nodes, node_id)
            )

    _create_annotated_node_objs(bulk_list)

    end = time.time()

    logger.info(
        "Created %s annotated nodes from %s nodes in %s msec",
        str(total_attrs),
        str(len(nodes)),
        str(end - start)
    )


def calculate_checksum(f, algorithm='md5', bufsize=8192):
    """Calculate the checksum of the datafile"""
    hasher = hashlib.new(algorithm)
    try:
        block = f.read(bufsize)
        while len(block) > 0:
            hasher.update(block)
            block = f.read(bufsize)
    except AttributeError:
        logger.debug(
            'Checksum couldn\'t be calculated because the file was not '
            'available.'
        )
    return hasher.hexdigest()


def add_annotated_nodes_selection(
        node_uuids,
        node_type,
        study_uuid,
        assay_uuid=None):
    _add_annotated_nodes(node_type, study_uuid, assay_uuid, node_uuids)


def _add_annotated_nodes(
        node_type,
        study_uuid,
        assay_uuid=None,
        node_uuids=None):
    """Add annotated nodes.

    If `node_uuids=None` nothing is happeneing. This should be checked right
    away.
    """
    if node_uuids is None:
        return

    # Get the first study with study UUID
    try:
        study = Study.objects.filter(uuid=study_uuid)[0]
    # NameError will raise almost immediately later
    except IndexError as e:
        logger.error('Study object does not exist for uuid %s: %s',
                     study_uuid, e)

    if assay_uuid is not None:
        try:
            assay = Assay.objects.filter(uuid=assay_uuid)[0]
        # NameError will raise almost immediately later
        except IndexError as e:
            logger.error('Assay object does not exist for uuid %s: %s',
                         assay_uuid, e)
    else:
        assay = None

    # Retrieve annotated nodes
    nodes = _retrieve_nodes(study_uuid, assay_uuid, True)
    logger.info("%s retrieved from data set", str(len(nodes)))

    # Insert node and attribute information
    start = time.time()

    counter = 0
    bulk_list = []

    for node_id, node in nodes.iteritems():
        if node["type"] == node_type:
            if node["uuid"] in node_uuids:
                bulk_list, num_created = _create_annotated_node_objs(
                    bulk_list,
                    node,
                    study,
                    assay,
                    _get_unique_parent_attributes(nodes, node_id)
                )
                counter += num_created

    _create_annotated_node_objs(bulk_list)

    if len(bulk_list) > 0:
        AnnotatedNode.objects.bulk_create(bulk_list)

    end = time.time()

    logger.info(
        "Added %s annotated nodes from %s nodes in %s msec",
        str(counter),
        str(len(nodes)),
        str(end - start)
    )


def index_annotated_nodes(node_type, study_uuid, assay_uuid=None):
    _index_annotated_nodes(node_type, study_uuid, assay_uuid, None)


def index_annotated_nodes_selection(node_uuids):
    _index_annotated_nodes(None, None, None, node_uuids)


def _index_annotated_nodes(node_type, study_uuid, assay_uuid=None,
                           node_uuids=None):
    if node_uuids is None:
        if assay_uuid is None:
            nodes = Node.objects.filter(
                Q(study__uuid=study_uuid, assay__uuid__isnull=True),
                type=node_type)
        else:
            nodes = Node.objects.filter(
                Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
                Q(study__uuid=study_uuid, assay__uuid=assay_uuid),
                type=node_type)
    else:
        nodes = Node.objects.filter(uuid__in=node_uuids)
    logger.info("%s nodes for indexing", str(nodes.count()))
    # index nodes
    start = time.time()
    counter = 0
    for node in nodes:
        node.update_solr_index()
        counter += 1
    end = time.time()
    logger.info("%s nodes indexed in %s", str(counter), str(end - start))


def generate_solr_params_for_assay(params, assay_uuid, exclude_facets=[]):
    """Creates the encoded solr params requiring only an assay.
    Keyword Argument
        params -- python dict or QueryDict
    Params/Solr Params
        is_annotation - metadata
        offset - paginate, offset response
        limit/row - maximum number of documents
        facet_field - specify a field which should be treated as a facet
        facet_filter - adds params to facet fields&fqs for filtering on fields
        sort - Ordering include field name, whitespace, & asc or desc.
     """
    return generate_solr_params(params, [assay_uuid], False, exclude_facets)


def generate_solr_params(params, assay_uuids, facets_from_config=False,
                         exclude_facets=[]):
    """Either returns a solr parameters obj, or None if assay_uuids is empty
    """
    if len(assay_uuids) == 0:
        return None

    facet_field = params.get('facets')
    facet_filter = params.get('filter_attribute')
    is_annotation = params.get('is_annotation', 'false')
    # row number suggested by solr docs, since there's no unlimited option
    row = params.get('limit', str(constants.REFINERY_SOLR_DOC_LIMIT))
    start = params.get('offset', '0')
    sort = params.get('sort')
    fixed_solr_params = {
        "facet.limit": "-1",
        "fq": "is_annotation:{}".format(is_annotation),
        "rows": row,
        "start": start,
        "wt": "json"
    }

    filter_arr = [
        'assay_uuid:({})'.format(' OR '.join([str(u) for u in assay_uuids]))
    ]
    field_limit = []  # limit attributes to return
    facet_fields_obj = {}  # requested facets formatted for solr
    if facets_from_config:
        # Design choice to leave out _factor to avoid duplicate attributes
        for facet in settings.USER_FILES_FACETS.split(","):
            facet_template = '{0}_Characteristics{1}'
            facet_field = ','.join(
                [facet_template.format(s, NodeIndex.GENERIC_SUFFIX) for s
                 in settings.USER_FILES_FACETS.split(",")]
            )

        field_limit.extend(["*{}".format(NodeIndex.GENERIC_SUFFIX),
                            "name",
                            "*_uuid",
                            "uuid",
                            "type",
                            "django_id",
                            NodeIndex.DOWNLOAD_URL])

    if facet_field:
        facet_field_arr = facet_field.split(',')
        field_limit.extend(facet_field_arr)
    else:
        # Missing facet_fields, it is generated from Attribute Order Model.
        attributes_str = AttributeOrder.objects.filter(
            assay__uuid__in=assay_uuids
        )
        attributes = AttributeOrderSerializer(attributes_str, many=True)
        culled_attributes = cull_attributes_from_list(
            attributes.data,
            exclude_facets
        )
        facet_field_obj = generate_filtered_facet_fields(culled_attributes)
        facet_field_arr = facet_field_obj.get('facet_field')
        field_limit.extend(facet_field_obj.get('field_limit'))

    for facet in facet_field_arr:
        facet_fields_obj[facet] = {
            "type": "terms",
            "field": facet,
            "mincount": 1 if facets_from_config else 0
        }

    if facet_filter:
        if isinstance(facet_filter, unicode):
            facet_filter = urlunquote(facet_filter)
            try:
                facet_filter = json.loads(facet_filter)
            except ValueError:
                logger.error("Could not load facet_filter for assay %s",
                             filter_arr[0])
                facet_filter = []
        # exclude filters, for multi-select
        for facet in facet_filter:
            facet_fields_obj[facet]['excludeTags'] = facet.upper()
        filter_arr.extend(create_facet_filter_query(facet_filter))

    if sort:
        fixed_solr_params['sort'] = sort

    solr_params = {
        "json": {
            "query": 'django_ct:data_set_manager.node',
            "facet": facet_fields_obj,
            "filter": filter_arr,
            "fields": field_limit
        },
        "params": fixed_solr_params
    }

    return solr_params


def cull_attributes_from_list(attribute_list, attribute_names_to_remove):
    """Helper method which will remove the first matching attribute from the
    AttributeOrder based on the solr_field name.
    Keyword Argument
        attribute_list -- AttributeOrder list
        attribute_names_to_remove -- list of solr_field names"""
    culled_attributes = copy.copy(attribute_list)
    for name in attribute_names_to_remove:
        for attribute_obj in culled_attributes:
            if (attribute_obj.get('solr_field').startswith(name)):
                culled_attributes.remove(attribute_obj)
                break
    return culled_attributes


def create_facet_filter_query(facet_filter_fields):
    # Creates the solr request for the attribute filters
    filter_list = []
    for facet in facet_filter_fields:
        if len(facet_filter_fields[facet]) > 1:
            field_str = 'OR'.join(facet_filter_fields[facet])
        else:
            field_str = facet_filter_fields[facet][0]

        field_str = escape_character_solr(field_str)
        field_str = field_str.replace('OR', ' OR ')
        encoded_field_str = urlquote(field_str, safe='\\/+-&|!(){}[]^~*?:";@ ')

        filter_list.append(''.join(['{!tag=', facet.upper(), '}', facet,
                                    ':(', encoded_field_str, ')']))
    return filter_list


def escape_character_solr(field):
    # This escapes certain characters for solr requests fields
    match = ['\\',  '+', '-', '&', '|', '!', '(', ')',
             '{', '}', '[', ']', '^', '~', '*',
             '?', ':', '"', ';', ' ', '/', '@']

    for item in match:
        if item in field:
            field = field.replace(item, ('\\' + item))

    return field


def hide_fields_from_list(facet_obj):
    """Returns a filtered facet field list from a weighted facet object."""

    filtered_facet_list = []
    for field in facet_obj:
        solr_field = field.get('solr_field')
        if not is_field_in_hidden_list(solr_field):
            filtered_facet_list.append(field)

    return filtered_facet_list


def is_field_in_hidden_list(field):
    hidden_fields = ['id', 'data_set_uuid', 'django_id', 'file_uuid',
                     'study_uuid', 'assay_uuid', 'type', 'is_annotation',
                     'species', 'genome_build', 'name', 'django_ct']

    if field in hidden_fields or NodeIndex.GENERIC_SUFFIX in field:
        return True
    else:
        return False


def generate_filtered_facet_fields(attributes):
    """ Returns a filter facet field list. Attribute order contains whether
    facets should be used. Based on is_exposed and is_facet."""
    weighted_facet_list = []
    field_limit_list = []
    facet_field = []
    filtered_attributes = hide_fields_from_list(attributes)

    for field in filtered_attributes:
        if field.get('is_exposed'):
            weighted_facet_list.append((int(field['rank']), field))
            if field.get('is_facet'):
                facet_field.append(field.get('solr_field'))

    weighted_facet_list.sort()
    for (rank, field) in weighted_facet_list:
        field_limit_list.append(field.get("solr_field"))

    # add refinery_datafile_s index here
    field_limit_list.insert(0, unicode(NodeIndex.DATAFILE, "utf-8"))

    return {'facet_field': facet_field,
            'field_limit': field_limit_list}


def search_solr(encoded_params, core):
    """Returns solr full_response content by making a solr request
    Parameters:
        encoded_params:  Expect the params to be url-ready (using urlquote)
        core: Specify which node
    """
    url_portion = '/'.join([core, "select"])
    url = urlparse.urljoin(settings.REFINERY_SOLR_BASE_URL, url_portion)
    full_response = requests.post(url,
                                  json=encoded_params.get('json'),
                                  params=encoded_params.get('params'))
    if not full_response.ok:
        try:
            response_obj = json.loads(full_response.content)
        except ValueError:
            raise RuntimeError(
                'Expected Solr JSON, not: {}'.format(full_response.content)
            )
        try:
            raise RuntimeError('Solr error: {}\nin context: {}'.format(
                response_obj['error']['msg'],
                response_obj
            ))
        except KeyError:
            raise RuntimeError(
                'Not expected response structure: {}'.format(response_obj)
            )

    response = full_response.content

    return response


def get_owner_from_assay(uuid):
    # Returns the owner from an assay_uuid. Ownership is passed from dataset
    try:
        study = Study.objects.get(assay__uuid=uuid)
    except (Study.DoesNotExist, Study.MultipleObjectsReturned,
            ValueError) as exc:
        logger.error(exc)
        return None

    try:
        data_set = study.get_dataset()
    except RuntimeError as exc:
        logger.error(exc)
        return None

    return data_set.get_owner()


def format_solr_response(solr_response):
    # Returns a reformatted solr response
    solr_response_json = json.loads(solr_response)

    # Reorganizes solr response into easier to digest objects.
    try:
        order_facet_fields = json.loads(solr_response_json['responseHeader']
                                        ['params']['json']).get('fields')
    except KeyError:
        order_facet_fields = []

    if solr_response_json.get('facets'):
        solr_response_json['facet_field_counts'] = create_facet_field_counts(
            solr_response_json.get('facets')
        )
        del solr_response_json['facets']
    else:
        solr_response_json['facet_field_counts'] = {}

    facet_field_docs = solr_response_json.get('response').get('docs')
    facet_field_docs_count = solr_response_json.get('response').get('numFound')
    attributes = customize_attribute_response(order_facet_fields)
    solr_response_json["attributes"] = attributes
    solr_response_json["nodes"] = facet_field_docs
    solr_response_json["nodes_count"] = facet_field_docs_count

    # Remove unused fields from solr response
    del solr_response_json['responseHeader']
    del solr_response_json['response']

    return solr_response_json


def create_facet_field_counts(facet_fields):
    # Returns the facet_field_counts from solr's facets' response. Solr returns
    # buckets with an array of objects {count: int, val: str}

    facet_field_counts = {}
    for field_name, count_obj in facet_fields.iteritems():
        if field_name == 'count':
            continue
        count_array = count_obj.get('buckets')
        for field_obj in count_array:
            field_obj['name'] = field_obj.get('val')
            del field_obj['val']

        if count_array:
            # sort fields depending on count
            count_array.sort(key=lambda x: x['count'], reverse=True)
            facet_field_counts[field_name] = count_array

    return facet_field_counts


def customize_attribute_response(facet_fields):
    # Returns an array of attribute objects based on parsing the title
    try:
        iter(facet_fields)
    except TypeError:
        return facet_fields

    attribute_array = []
    for field in facet_fields:
        # For fields with filters, they need to be trimmed
        if '!ex' in field:
            field = field.split("}")[1]

        customized_field = {'internal_name': field}

        field_name = field.split('_')
        # For uuid fields
        if len(field_name) > 1:
            customized_field['file_ext'] = field_name[-1]

        field_edit_type = ''
        field_normalized = field.replace('_', ' ')
        for edit_type in Attribute.editable_types:
            if edit_type in field_normalized:
                field_edit_type = edit_type
                break

        if 'REFINERY_SUBANALYSIS' in field:
            customized_field['display_name'] = 'Analysis Group'
            customized_field['attribute_type'] = 'Internal'
        elif 'REFINERY_WORKFLOW_OUTPUT' in field:
            customized_field['display_name'] = 'Output Type'
            customized_field['attribute_type'] = 'Internal'
        elif 'REFINERY_FILETYPE' in field:
            customized_field['display_name'] = 'File Type'
            customized_field['attribute_type'] = 'Internal'
        elif 'REFINERY' in field:
            customized_field['display_name'] = field_name[1].title()
            customized_field['attribute_type'] = 'Internal'
        elif field_edit_type:
            index = field_name.index(field_edit_type.split(' ')[0])
            # some attributes don't have a name hence the default 1
            field_name = ' '.join(field_name[0:index or 1])
            customized_field['display_name'] = field_name.title()
            customized_field['attribute_type'] = field_edit_type
        # For uuid fields
        elif len(field_name) == 1:
            customized_field['display_name'] = \
                customized_field['internal_name']
        else:
            customized_field['display_name'] = ' '.join(
                    field_name[0:-3]).title()

        attribute_array.append(customized_field)

    return attribute_array


def initialize_attribute_order_ranks(selected_attribute, new_rank):
    # With a new set of attribute orders, this will set a default rank
    attribute_list = AttributeOrder.objects.filter(
        assay=selected_attribute.assay)
    new_increment_rank = 1
    for attribute in attribute_list:
        # new rank is handled seperately
        if new_increment_rank == new_rank:
            new_increment_rank = new_increment_rank + 1
        # internal attributes aren't shown, does not need rank
        if not attribute.is_internal:
            # updates requested attribute
            if attribute == selected_attribute:
                serializer = AttributeOrderSerializer(
                        attribute,
                        {'rank': new_rank},
                        partial=True)
            # updates all other attributes
            else:
                serializer = AttributeOrderSerializer(
                    attribute,
                    {'rank': new_increment_rank},
                    partial=True)
                new_increment_rank = new_increment_rank + 1

            if serializer.is_valid():
                serializer.save()
            else:
                return serializer.error


def update_attribute_order_ranks(old_attribute, new_rank):
    # Updates an assays attribute order ranks based on a singular object
    try:
        assert(int(new_rank) >= 0)
    except AssertionError:
        return "Invalid: rank must be integer >= 0"
    except TypeError:
        return "Invalid: rank must be a string or a number."

    try:
        assert(old_attribute.rank != new_rank)
    except AssertionError:
        return "Error: New rank == old rank"

    assay = old_attribute.assay
    old_rank = int(old_attribute.rank)
    attribute_list = AttributeOrder.objects.filter(assay=assay)
    new_rank = int(new_rank)

    for attribute in attribute_list:
        attribute_new_rank = int(attribute.rank)

        if attribute == old_attribute:
            attribute_new_rank = new_rank
        elif new_rank == 0:
            if old_rank < attribute.rank:
                attribute_new_rank = attribute.rank-1
        elif old_rank == 0:
            if old_rank < attribute.rank >= new_rank:
                attribute_new_rank = attribute.rank+1
        else:
            if old_rank > attribute.rank >= new_rank:
                attribute_new_rank = attribute.rank+1
            elif old_rank < attribute.rank <= new_rank:
                attribute_new_rank = attribute.rank-1

        serializer = AttributeOrderSerializer(
                        attribute,
                        {'rank': attribute_new_rank},
                        partial=True)

        if serializer.is_valid():
            serializer.save()
        else:
            return serializer.error

    return


def get_file_url_from_node_uuid(node_uuid, require_valid_url=False):
    """
    Fetch the full url pointing to a Node's datafile by passing in a Node UUID.
    NOTE: Since this method is called within the context of a db transaction,
    we are raising exceptions within to nullify said transaction.

    :param node_uuid: Node.uuid
    :param require_valid_url: boolean
    :return: a full url pointing to the fetched Node's datafile or None
    :raises: RuntimeError if a Node can't be fetched or if a valid
    datafile url was explicitly required and one wasn't available (Ex: We need
    to check a Tool launch's input Nodes in this manner to ensure a Tool
    Launch has data file urls to work with)
    """
    try:
        node = Node.objects.get(uuid=node_uuid)
    except (Node.DoesNotExist, Node.MultipleObjectsReturned):
        raise RuntimeError("Couldn't fetch Node by UUID from: {}"
                           .format(node_uuid))
    else:
        try:
            url = node.file_item.get_datafile_url()
        except AttributeError:
            url = None
        if require_valid_url:
            if url is None:
                raise RuntimeError(
                    "Node with uuid: {} has no associated file url"
                    .format(node_uuid)
                )
        try:
            return core.utils.get_absolute_url(url) if url else None
        except ValueError as e:
            logger.error('URL {} is not a valid relative url'.format(str(url)))
            raise type(e)(e.message)


def fix_last_column(file):
    """If the header has empty columns in it, then it will delete this and
    corresponding columns in the rows; returns 0 or 1 based on whether it
    failed or was successful, respectively
    Parameters:
    file: name of file to fix
    """
    # TODO: exception handling for file operations (IOError)
    logger.info("trying to fix the last column if necessary")
    # FIXME: use context manager to handle file opening and closing
    reader = csv.reader(open(file, 'rU'), dialect='excel-tab')
    tempfilename = tempfile.NamedTemporaryFile().name
    writer = csv.writer(open(tempfilename, 'wb'), dialect='excel-tab')
    # check that all rows have the same length
    header = reader.next()
    header_length = len(header)
    num_empty_cols = 0  # number of empty header columns
    # TODO: throw exception if there is an empty field in the header between
    # two non-empty fields
    for item in header:
        if not item.strip():
            num_empty_cols += 1
    # write the file
    writer.writerow(header[:-num_empty_cols])
    if num_empty_cols > 0:  # if there are empty header columns
        logger.info("Empty columns in header present, attempting to fix...")
        # check that all the rows are the same length
        line = 0
        for row in reader:
            line += 1
            if len(row) < header_length - num_empty_cols:
                logger.error(
                    "Line " + str(line) + " in the file had fewer fields than "
                    "the header.")
                return False
            # check that all the end columns that are supposed to be empty are
            i = 0
            if len(row) > len(header) - num_empty_cols:
                while i < num_empty_cols:
                    i += 1
                    check_item = row[-i].strip()
                    if check_item:  # item not empty
                        logger.error(
                            "Found a value in " + str(line) +
                            " where an empty column was expected.")
                        return False
                writer.writerow(row[:-num_empty_cols])
            else:
                writer.writerow(row)
        shutil.move(tempfilename, file)
    return True


def _create_solr_params_from_node_uuids(node_uuids):
    """
    Create and return a dict containing the proper Solr params to query
    for the information of many Nodes
    """
    return {
        'json': {
            "query": "django_ct:data_set_manager.node",
            "filter": "uuid:({})".format(" OR ".join(node_uuids)),
            },
        'params': {
            "wt": "json",
            "rows": constants.REFINERY_SOLR_DOC_LIMIT
            }
        }


def get_solr_response_json(node_uuids):
    """
    Fetch the information indexed within Solr for many Nodes and return
    it as JSON
    """
    solr_response = search_solr(
        _create_solr_params_from_node_uuids(node_uuids),
        'data_set_manager'
    )
    return format_solr_response(solr_response)


def get_first_annotated_node_from_solr_name(solr_name, node):
    # Helper method which get a node's first annotated node based on
    # solr_name
    # splits solr name into type and subtype
    attribute_obj = customize_attribute_response([solr_name])[0]
    attribute_subtype = attribute_obj.get('display_name')
    attribute_type = attribute_obj.get('attribute_type')
    # some attributes don't have a subtype, so display_name will be a
    # the first word of the attribute type
    if attribute_subtype in attribute_type:
        attribute_subtype = None
    return AnnotatedNode.objects.filter(
        node=node,
        attribute_type=attribute_type,
        attribute_subtype__iexact=attribute_subtype
    ).first()
