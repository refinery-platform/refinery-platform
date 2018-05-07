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
def get_node_attributes(study_uuid, assay_uuid, node=None, node_type=None):
    """node_type indicates the node type for which the available attributes
    should be determined. node_type should be in
    Node.ASSAYS | Node.FILES | Node.SOURCE | Node.SAMPLE | Node.EXTRACT |
    Node.LABELED_EXTRACT
    If node is not None, node_type will be ignored and the method will return
    the attributes for this node (and its node type).
    """
    if node is None:
        try:
            if assay_uuid is None:
                node = Node.objects.filter(
                    Q(study__uuid=study_uuid, assay__uuid__isnull=True),
                    type=node_type)[0]
            else:
                node = Node.objects.filter(
                    Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
                    Q(study__uuid=study_uuid, assay__uuid=assay_uuid),
                    type=node_type)[0]
        except:
            return None
    # assumption: we now have a node
    return _get_node_attributes_recursion(node)


def _get_node_attributes_recursion(node):
    attributes = []

    for attribute in node.attribute_set.all():
        attributes.append({
            "type": attribute.type,
            "subtype": attribute.subtype
        })
    try:
        parent = node.parents.all()[0]
        attributes.extend(_get_node_attributes_recursion(parent))
    except:
        pass

    return attributes


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


def _get_parent_attributes(nodes, node_id):
    """Recursively collects attributes from the current node and each parent
    node until no more parents are available.
    """
    attributes = []

    if len(nodes[node_id]["parents"]) == 0:
        # End of recursion
        return nodes[node_id]["attributes"]

    for parent_id in nodes[node_id]["parents"]:
        attributes.extend(_get_parent_attributes(nodes, parent_id))

    attributes.extend(nodes[node_id]["attributes"])
    return attributes


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


def _get_assay_name(result, node):
    if result[node]["type"] in Node.ASSAYS:
        return result[node]["name"]

    for parent in result[node]["parents"]:
        return _get_assay_name(result, parent)

    return None


def _retrieve_nodes(
        study_uuid,
        assay_uuid=None,
        ontology_attribute_fields=False,
        node_uuids=None):
    """Retrieve all nodes associated to a study and optionally associated to an
    assay.

    If `node_uuids` is `None` query nodes (both from assay and from study only)
    """
    node_fields = [
        "id",
        "uuid",
        "file_uuid",
        "type",
        "name",
        "parents",
        "attribute"
    ]

    # Build filters
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
    node_list = (
        Node.objects
            .filter(*q_filters, **filters)
            .prefetch_related("attribute_set")
            .order_by("id", "attribute")
            .values(*node_fields)
    )

    if ontology_attribute_fields:
        attribute_fields = Attribute.ALL_FIELDS
    else:
        attribute_fields = Attribute.NON_ONTOLOGY_FIELDS

    attribute_list = (
        Attribute.objects
                 .filter()
                 .order_by("id")
                 .values_list(*attribute_fields)
    )

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
                current_node["parents"] = uniquify(current_node["parents"])
                nodes[current_id] = current_node

            # new node, start merging
            current_id = node["id"]
            current_node = {
                "id": node["id"],
                "uuid": node["uuid"],
                "attributes": [],
                "parents": [],
                "name": node["name"],
                "type": node["type"],
                "file_uuid": node["file_uuid"]
            }

        # Fritz: Do the parents really differ or is this overhead?
        if node["parents"] is not None:
            current_node["parents"].append(node["parents"])

        if node["attribute"] is not None:
            try:
                current_node["attributes"].append(
                    attributes[node["attribute"]]
                )
            except:
                pass

    # save last node
    if current_node is not None:
        current_node["parents"] = uniquify(current_node["parents"])
        nodes[current_id] = current_node

    return nodes


def get_nodes(node_type, study_uuid, assay_uuid=None,
              ontology_attribute_fields=False):
    nodes = _retrieve_nodes(study_uuid, assay_uuid, ontology_attribute_fields)
    results = {}
    attribute_count = 0
    for key in nodes:
        if nodes[key]["type"] == node_type:
            results[nodes[key]["uuid"]] = nodes[key].copy()
            results[nodes[key]["uuid"]]["attributes"] = \
                _get_parent_attributes(nodes, key)
            attribute_count += len(results[nodes[key]["uuid"]]["attributes"])
    logger.info("Nodes: %s   attributes: %s",
                str(len(results)), str(attribute_count))
    return results


# this method is obsolete - do not use!
def get_matrix(node_type, study_uuid, assay_uuid=None,
               ontology_attribute_fields=False):
    nodes = _retrieve_nodes(study_uuid, assay_uuid, ontology_attribute_fields)
    results = {}
    results["meta"] = {}
    results["data"] = {}
    results["meta"]["study"] = study_uuid
    results["meta"]["assay"] = assay_uuid
    results["meta"]["attributes"] = None
    results["meta"]["type"] = node_type
    attribute_count = 0

    for key in nodes:
        if nodes[key]["type"] == node_type:
            # copy a subset of the node model attributes
            results["data"][nodes[key]["uuid"]] = {
                k: nodes[key].copy()[k] for k in ("name", "file_uuid")}
            # get the name of the nearest assay node predecessor
            results["data"][nodes[key]["uuid"]]["assay"] = _get_assay_name(
                nodes, key)
            # initialize attribute list
            results["data"][nodes[key]["uuid"]]["attributes"] = []
            # save attributes (attribute[1], etc. are based on
            # Attribute.ALL_FIELDS
            for attribute in _get_parent_attributes(nodes, key):
                results["data"][nodes[key]["uuid"]]["attributes"].append(
                    attribute[3])  # 3 = value
                if attribute[4] is not None:
                    results["data"][nodes[key]["uuid"]]["attributes"][-1] += \
                        " " + attribute[4]  # 4 = value unit
            # store attribute labels in meta section (only for the first node
            # -> for all further nodes the assumption is that they have the
            # same attribute list)
            if results["meta"]["attributes"] is None:
                results["meta"]["attributes"] = []
                for attribute in _get_parent_attributes(nodes, key):
                    results["meta"]["attributes"].append(
                        {"type": attribute[1], "subtype": attribute[2]})
            attribute_count += len(
                results["data"][nodes[key]["uuid"]]["attributes"])
    return results


def _create_annotated_node_objs(
        bulk_list=[],
        node=None,
        study=None,
        assay=None,
        attrs=None):
    """Helper method to bulk create annotated nodes.
    """
    counter = 0
    if (node is not None and
            study is not None and
            assay is not None and
            attrs is not None):
        for attr_key in attrs:
            counter += 1
            bulk_list.append(
                AnnotatedNode(
                    node_id=node["id"],
                    attribute_id=attrs[attr_key][0],
                    study=study,
                    assay=assay,
                    node_uuid=node["uuid"],
                    node_file_uuid=node["file_uuid"],
                    node_type=node["type"],
                    node_name=node["name"],
                    attribute_type=attrs[attr_key][1],
                    attribute_subtype=attrs[attr_key][2],
                    attribute_value=attrs[attr_key][3],
                    attribute_value_unit=attrs[attr_key][4]
                )
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
    study = Study.objects.get(uuid=study_uuid)

    if assay_uuid is not None:
        assay = Assay.objects.get(uuid=assay_uuid)
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
    study = Study.objects.filter(uuid=study_uuid)[0]

    if assay_uuid is not None:
        assay = Assay.objects.filter(uuid=assay_uuid)[0]
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
    node_index = NodeIndex()
    counter = 0
    for node in nodes:
        node_index.update_object(node, using="data_set_manager")
        counter += 1
    end = time.time()
    logger.info("%s nodes indexed in %s", str(counter), str(end - start))


def generate_solr_params_for_assay(params, assay_uuid, exclude_facets=[]):
    """Creates the encoded solr params requiring only an assay.
    Keyword Argument
        params -- python dict or QueryDict
    Params/Solr Params
        is_annotation - metadata
        facet_count/facet - enables facet counts in query response, true/false
        offset - paginate, offset response
        limit/row - maximum number of documents
        field_limit - set of fields to return
        facet_field - specify a field which should be treated as a facet
        facet_filter - adds params to facet fields&fqs for filtering on fields
        facet_pivot - list of fields to pivot
        sort - Ordering include field name, whitespace, & asc or desc.
        fq - filter query
     """
    return generate_solr_params(params, [assay_uuid], False, exclude_facets)


def generate_solr_params(
        params,
        assay_uuids,
        facets_from_config=False,
        exclude_facets=[]):
    """
    Either returns a solr url parameter string,
    or None if assay_uuids is empty.
    """

    is_annotation = params.get('is_annotation', 'false')
    facet_count = params.get('include_facet_count', 'true')
    start = params.get('offset', '0')
    # row number suggested by solr docs, since there's no unlimited option
    row = params.get('limit', str(constants.REFINERY_SOLR_DOC_LIMIT))
    field_limit = params.get('attributes')
    facet_field = params.get('facets')
    facet_pivot = params.get('pivots')
    sort = params.get('sort')
    facet_filter = params.get('filter_attribute')

    fixed_solr_params = \
        '&'.join(['fq=is_annotation:%s' % is_annotation,
                  'start=%s' % start,
                  'rows=%s' % row,
                  'q=django_ct:data_set_manager.node&wt=json',
                  'facet=%s' % facet_count,
                  'facet.limit=-1'
                  ])

    if len(assay_uuids) == 0:
        return None
    solr_params = 'fq=assay_uuid:({})'.format(' OR '.join(assay_uuids))

    fq = params.get('fq')
    if fq is not None:
        solr_params += '&fq=' + fq

    if facets_from_config:
        # Twice as many facets as necessary, but easier than the alternative.
        facet_template = '{0}_Characteristics{1},{0}_Factor_Value{1}'
        facet_field = ','.join(
            [facet_template.format(s, NodeIndex.GENERIC_SUFFIX) for s
             in settings.USER_FILES_FACETS.split(",")]
        )
        solr_params += '&fl=*{},name,*_uuid,type,django_id,{}'.format(
            NodeIndex.GENERIC_SUFFIX, NodeIndex.DOWNLOAD_URL)

    if facet_field:
        facet_field = facet_field.split(',')
        facet_field = insert_facet_field_filter(facet_filter, facet_field)
        split_facet_fields = generate_facet_fields_query(facet_field)
        solr_params = ''.join([solr_params, split_facet_fields])
    else:
        # Missing facet_fields, it is generated from Attribute Order Model.
        attributes_str = AttributeOrder.objects.filter(
            assay__uuid__in=assay_uuids  # TODO: Confirm this syntax
        )
        attributes = AttributeOrderSerializer(attributes_str, many=True)
        culled_attributes = cull_attributes_from_list(
            attributes.data,
            exclude_facets
        )
        facet_field_obj = generate_filtered_facet_fields(culled_attributes)
        facet_field = facet_field_obj.get('facet_field')
        facet_field = insert_facet_field_filter(facet_filter, facet_field)
        field_limit = ','.join(facet_field_obj.get('field_limit'))
        facet_fields_query = generate_facet_fields_query(facet_field)
        solr_params = ''.join([solr_params, facet_fields_query])

    if field_limit:
        solr_params = ''.join([solr_params, '&fl=', field_limit])

    if facet_pivot:
        solr_params = ''.join([solr_params, '&facet.pivot=', facet_pivot])

    if sort:
        solr_params = ''.join([solr_params, '&sort=', sort])

    if facet_filter:
        # handle default formatting in get request, query_params
        if isinstance(facet_filter, unicode):
            facet_filter = urlunquote(facet_filter)
            facet_filter = json.loads(facet_filter)
        facet_filter_str = create_facet_filter_query(facet_filter)
        solr_params = ''.join([solr_params, facet_filter_str])

    url = '&'.join([solr_params, fixed_solr_params])
    encoded_solr_params = urlquote(url, safe='\\=&! ')

    return encoded_solr_params


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


def insert_facet_field_filter(facet_filter, facet_field_arr):
    # For solr requests, removes duplicate facet fields with filters from
    # facet_field_arr, maintains facet_field order
    if facet_filter:
        # handle default formatting in get request, query_params
        if isinstance(facet_filter, unicode):
            facet_filter = json.loads(facet_filter)
        for facet in facet_filter:
            ind = facet_field_arr.index(facet)
            facet_field_arr[ind] = ''.join(['{!ex=', facet, '}', facet])

    return facet_field_arr


def create_facet_filter_query(facet_filter_fields):
    # Creates the solr request for the attribute filters
    query = ''
    for facet in facet_filter_fields:
        if len(facet_filter_fields[facet]) > 1:
            field_str = 'OR'.join(facet_filter_fields[facet])
        else:
            field_str = facet_filter_fields[facet][0]

        field_str = escape_character_solr(field_str)
        field_str = field_str.replace('OR', ' OR ')
        encoded_field_str = urlquote(field_str, safe='\\/+-&|!(){}[]^~*?:";@ ')

        query = ''.join([query, '&fq={!tag=', facet, '}',
                         facet, ':(', encoded_field_str, ')'])
    return query


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
    hidden_fields = ['id', 'django_id', 'file_uuid', 'study_uuid',
                     'assay_uuid', 'type', 'is_annotation', 'species',
                     'genome_build', 'name', 'django_ct']

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

    return {'facet_field': facet_field,
            'field_limit': field_limit_list}


def generate_facet_fields_query(facet_fields):
    """Return facet_field query (str).
        Solr requirs facet fields to be separated"""
    query = ""
    for field in facet_fields:
        query = ''.join([query, '&facet.field=', field])

    return query


def search_solr(encoded_params, core):
    """Returns solr full_response content by making a solr request
    Parameters:
        encoded_params:  Expect the params to be url-ready (using urlquote)
        core: Specify which node
    """
    url_portion = '/'.join([core, "select"])
    url = urlparse.urljoin(settings.REFINERY_SOLR_BASE_URL, url_portion)
    full_response = requests.get(url, params=encoded_params)
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
        investigation_key = Study.objects.get(assay__uuid=uuid).investigation
    except (Study.DoesNotExist,
            Study.MultipleObjectsReturned) as e:
        logger.error(e)
        return "Error: Invalid uuid"

    investigation_link = core.models.InvestigationLink.objects.get(
            investigation=investigation_key)
    owner = core.models.DataSet.objects.get(
            investigationlink=investigation_link).get_owner()

    return owner


def format_solr_response(solr_response):
    # Returns a reformatted solr response
    solr_response_json = json.loads(solr_response)

    # Reorganizes solr response into easier to digest objects.
    try:
        order_facet_fields_joined = (solr_response_json
                                     ['responseHeader']['params']['fl'])
    except KeyError:
        order_facet_fields = []
    else:
        order_facet_fields = order_facet_fields_joined.split(',')

    if solr_response_json.get('facet_counts'):
        facet_field_counts = solr_response_json.get('facet_counts').get(
            'facet_fields')
        facet_field_counts_obj = objectify_facet_field_counts(
            facet_field_counts)
        solr_response_json['facet_field_counts'] = facet_field_counts_obj
        del solr_response_json['facet_counts']
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


def objectify_facet_field_counts(facet_fields):
    # Returns an array of objects with facet_field_count corrected. Solr
    # returns an array with key and value.
    # count_array = [key1,value1,key2,value2...]
    for field, count_array in facet_fields.iteritems():
        count_obj_array = []

        for index in range(0, len(count_array), 2):
            count_obj_array.append(
                    {'name': count_array[index],
                     'count': count_array[index + 1]
                     })

        # sort fields depending on count
        count_obj_array.sort(key=lambda x: x['count'], reverse=True)
        facet_fields[field] = count_obj_array

    return facet_fields


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
        elif 'Comment' in field:
            index = field_name.index('Comment')
            field_name = ' '.join(field_name[0:index])
            customized_field['display_name'] = field_name.title()
            customized_field['attribute_type'] = 'Comment'
        elif 'Factor' in field:
            index = field_name.index('Factor')
            field_name = ' '.join(field_name[0:index])
            customized_field['display_name'] = field_name.title()
            customized_field['attribute_type'] = 'Factor Value'
        elif 'Characteristics' in field:
            index = field_name.index('Characteristics')
            field_name = ' '.join(field_name[0:index])
            customized_field['display_name'] = field_name.title()
            customized_field['attribute_type'] = 'Characteristics'
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


def get_file_url_from_node_uuid(node_uuid):
    """
    Fetch the full url pointing to a Node's datafile by passing in a Node UUID.
    NOTE: Since this method is called within the context of a db transaction,
    we are raising exceptions within to nullify said transaction.

    :param node_uuid: Node.uuid
    :return: a full url pointing to the fetched Node's datafile
    :raises: RuntimeError if a Node can't be fetched or if a Fetched Node
    has no file associated with it to build a url from
    """
    try:
        node = Node.objects.get(uuid=node_uuid)
    except (Node.DoesNotExist, Node.MultipleObjectsReturned):
        raise RuntimeError(
            "Couldn't fetch Node by UUID from: {}".format(node_uuid)
        )
    else:
        url = node.get_relative_file_store_item_url()

        if url is None:
            raise RuntimeError(
                "Node with uuid: {} has no associated file url".format(
                    node.uuid
                )
            )
        else:
            return core.utils.get_absolute_url(url)


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
        "q": "django_ct:data_set_manager.node",
        "wt": "json",
        "fq": "uuid:({})".format(" OR ".join(node_uuids)),
        "rows": constants.REFINERY_SOLR_DOC_LIMIT
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
