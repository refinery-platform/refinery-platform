'''
Created on May 29, 2012

@author: nils
'''
import hashlib
import logging
import time
import urlparse
import requests
import json

from django.db.models import Q
from django.utils.http import (urlquote, urlunquote)
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

import core
from data_set_manager.search_indexes import NodeIndex
from .models import (AttributeOrder, Study, Node, Attribute, AnnotatedNode,
                     Assay, AnnotatedNodeRegistry)
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


def _get_assay_name(result, node):
    if result[node]["type"] in Node.ASSAYS:
        return result[node]["name"]

    for parent in result[node]["parents"]:
        return _get_assay_name(result, parent)

    return None


def _retrieve_nodes(study_uuid, assay_uuid=None,
                    ontology_attribute_fields=False, node_uuids=None):
    node_fields = [
        "id",
        "uuid",
        "file_uuid",
        "type",
        "name",
        "parents",
        "attribute"
    ]
    # if node_uuids is none: query nodes (both from assay and from study only)
    if node_uuids is None:
        if assay_uuid is None:
            node_list = Node.objects.filter(
                Q(study__uuid=study_uuid, assay__uuid__isnull=True)
            ).prefetch_related("attribute_set").order_by(
                "id", "attribute").values(*node_fields)
        else:
            node_list = Node.objects.filter(
                Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
                Q(study__uuid=study_uuid, assay__uuid=assay_uuid)
            ).prefetch_related("attribute_set").order_by(
                "id", "attribute").values(*node_fields)
    else:
        node_list = (
            Node.objects
                .filter(uuid__in=node_uuids)
                .prefetch_related("attribute_set")
                .order_by("id", "attribute")
                .values(*node_fields)
        )
    if ontology_attribute_fields:
        attribute_fields = Attribute.ALL_FIELDS
    else:
        attribute_fields = Attribute.NON_ONTOLOGY_FIELDS
    attribute_list = Attribute.objects.filter().order_by("id").values_list(
        *attribute_fields)
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

        if node["parents"] is not None:
            current_node["parents"].append(node["parents"])
        if node["attribute"] is not None:
            try:
                current_node["attributes"].append(
                    attributes[node["attribute"]])
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


def update_annotated_nodes(node_type, study_uuid, assay_uuid=None,
                           update=False):
    # retrieve study and assay ids
    study = Study.objects.filter(uuid=study_uuid)[0]
    if assay_uuid is not None:
        assay = Assay.objects.filter(uuid=assay_uuid)[0]
    else:
        assay = None
    # check if this combination of node_type, study_uuid and assay_uuid already
    # exists
    if assay is None:
        registry, created = AnnotatedNodeRegistry.objects.get_or_create(
            study_id=study.id, assay__isnull=True, node_type=node_type)
    else:
        registry, created = AnnotatedNodeRegistry.objects.get_or_create(
            study_id=study.id, assay_id=assay.id, node_type=node_type)
    # update registry entry
    registry.save()
    if not created and not update:
        # registry entry exists and no updating requested
        return
    # remove existing annotated node objects for this node_type in this
    # study/assay
    if assay_uuid is None:
        counter = AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True),
            node_type=node_type).count()
        AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True),
            node_type=node_type).delete()
    else:
        counter = AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
            Q(study__uuid=study_uuid, assay__uuid=assay_uuid),
            node_type=node_type).count()
        AnnotatedNode.objects.filter(
            Q(study__uuid=study_uuid, assay__uuid__isnull=True) |
            Q(study__uuid=study_uuid, assay__uuid=assay_uuid),
            node_type=node_type).delete()
    logger.info(str(counter) + " annotated nodes deleted.")
    # retrieve annotated nodes
    nodes = _retrieve_nodes(study_uuid, assay_uuid, True)

    # Disabled because it creates super large log message.
    # a = [node["attributes"] for node_id, node in nodes.iteritems()]
    # logger.info(a)

    # insert node and attribute information
    start = time.time()
    counter = 0
    skipped_attributes = 0
    bulk_list = []
    for node_id, node in nodes.iteritems():
        if node["type"] == node_type:
            # save attributes (attribute[1], etc. are based on
            # Attribute.ALL_FIELDS)
            attributes = _get_parent_attributes(nodes, node_id)

            # List to keep track which attributes have already been added
            check_list = {}

            for attribute in attributes:
                # Skip if we've seen the attribute already
                if attribute[0] in check_list:
                    skipped_attributes += 1
                    continue

                counter += 1
                bulk_list.append(
                    AnnotatedNode(
                        node_id=node["id"],
                        attribute_id=attribute[0],
                        study=study,
                        assay=assay,
                        node_uuid=node["uuid"],
                        node_file_uuid=node["file_uuid"],
                        node_type=node["type"],
                        node_name=node["name"],
                        attribute_type=attribute[1],
                        attribute_subtype=attribute[2],
                        attribute_value=attribute[3],
                        attribute_value_unit=attribute[4]))

                # Position zero represents the attribute ID.
                check_list[attribute[0]] = True

                if len(bulk_list) == MAX_BULK_LIST_SIZE:
                    AnnotatedNode.objects.bulk_create(bulk_list)
                    bulk_list = []
    if len(bulk_list) > 0:
        AnnotatedNode.objects.bulk_create(bulk_list)
        bulk_list = []
    end = time.time()
    logger.info(
        "Skipped creating %s duplicated annotated nodes",
        str(skipped_attributes)
    )
    logger.info(
        "%s annotated nodes generated in %s", str(counter), str(end - start)
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


def add_annotated_nodes(node_type, study_uuid, assay_uuid=None):
    _add_annotated_nodes(node_type, study_uuid, assay_uuid, None)


def add_annotated_nodes_selection(node_uuids, node_type, study_uuid,
                                  assay_uuid=None):
    _add_annotated_nodes(node_type, study_uuid, assay_uuid, node_uuids)


def _add_annotated_nodes(node_type, study_uuid, assay_uuid=None,
                         node_uuids=None):
    study = Study.objects.filter(uuid=study_uuid)[0]
    if assay_uuid is not None:
        assay = Assay.objects.filter(uuid=assay_uuid)[0]
    else:
        assay = None
    # retrieve annotated nodes
    nodes = _retrieve_nodes(study_uuid, assay_uuid, True)
    logger.info("%s retrieved from data set", str(len(nodes)))
    # insert node and attribute information
    import time
    start = time.time()
    counter = 0
    bulk_list = []
    for node_id, node in nodes.iteritems():
        if node["type"] == node_type:
            if node_uuids is not None and (node["uuid"] in node_uuids):
                # save attributes (attribute[1], etc. are based on
                # Attribute.ALL_FIELDS)
                attributes = _get_parent_attributes(nodes, node_id)

                for attribute in attributes:
                    counter += 1

                    bulk_list.append(
                        AnnotatedNode(
                            node_id=node["id"],
                            attribute_id=attribute[0],
                            study=study,
                            assay=assay,
                            node_uuid=node["uuid"],
                            node_file_uuid=node["file_uuid"],
                            node_type=node["type"],
                            node_name=node["name"],
                            attribute_type=attribute[1],
                            attribute_subtype=attribute[2],
                            attribute_value=attribute[3],
                            attribute_value_unit=attribute[4]))
                    if len(bulk_list) == MAX_BULK_LIST_SIZE:
                        AnnotatedNode.objects.bulk_create(bulk_list)
                        bulk_list = []
    if len(bulk_list) > 0:
        AnnotatedNode.objects.bulk_create(bulk_list)
        bulk_list = []
    end = time.time()
    logger.info("%s annotated nodes generated in %s",
                str(counter), str(end - start))


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


def generate_solr_params(params, assay_uuid):
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

    file_types = 'fq=type:("Raw Data File" OR ' \
                 '"Derived Data File" OR ' \
                 '"Array Data File" OR ' \
                 '"Derived Array Data File" OR ' \
                 '"Array Data Matrix File" OR' \
                 '"Derived Array Data Matrix File")'

    is_annotation = params.get('is_annotation', default='false')
    facet_count = params.get('include_facet_count', default='true')
    start = params.get('offset', default='0')
    row = params.get('limit', default='20')
    field_limit = params.get('attributes', default=None)
    facet_field = params.get('facets', default=None)
    facet_pivot = params.get('pivots', default=None)
    sort = params.get('sort', default=None)
    facet_filter = params.get('filter_attribute', default=None)

    fixed_solr_params = \
        '&'.join([file_types,
                  'fq=is_annotation:%s' % is_annotation,
                  'start=%s' % start,
                  'rows=%s' % row,
                  'q=django_ct:data_set_manager.node&wt=json',
                  'facet=%s' % facet_count,
                  'facet.limit=-1'
                  ])

    solr_params = ''.join(['fq=assay_uuid:', assay_uuid])

    if facet_field:
        facet_field = facet_field.split(',')
        facet_field = insert_facet_field_filter(facet_filter, facet_field)
        split_facet_fields = generate_facet_fields_query(facet_field)
        solr_params = ''.join([solr_params, split_facet_fields])
    else:
        # Missing facet_fields, it is generated from Attribute Order Model.
        attributes_str = AttributeOrder.objects.filter(assay__uuid=assay_uuid)
        attributes = AttributeOrderSerializer(attributes_str, many=True)
        facet_field_obj = generate_filtered_facet_fields(attributes.data)
        facet_field = facet_field_obj.get('facet_field')
        facet_field = insert_facet_field_filter(facet_filter, facet_field)
        field_limit = ','.join(facet_field_obj.get('field_limit'))
        facet_field_query = generate_facet_fields_query(facet_field)
        solr_params = ''.join([solr_params, facet_field_query])

    if field_limit:
        solr_params = ''.join([solr_params, '&fl=', field_limit])

    if facet_pivot:
        solr_params = ''.join([solr_params, '&facet.pivot=', facet_pivot])

    if sort:
        solr_params = ''.join([solr_params, '&sort=', sort])

    if facet_filter:
        facet_filter = urlunquote(facet_filter)
        facet_filter = json.loads(facet_filter)
        facet_filter_str = create_facet_filter_query(facet_filter)
        solr_params = ''.join([solr_params, facet_filter_str])

    url = '&'.join([solr_params, fixed_solr_params])
    encoded_solr_params = urlquote(url, safe='\\=&! ')

    return encoded_solr_params


def insert_facet_field_filter(facet_filter, facet_field_arr):
    # For solr requests, removes duplicate facet fields with filters from
    # facet_field_arr, maintains facet_field order
    if facet_filter:
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
        encoded_field_str = urlquote(field_str, safe='\\/+-&|!(){}[]^~*?:"; ')

        query = ''.join([query, '&fq={!tag=', facet, '}',
                         facet, ':(', encoded_field_str, ')'])
    return query


def escape_character_solr(field):
    # This escapes certain characters for solr requests fields
    match = ['\\',  '+', '-', '&', '|', '!', '(', ')',
             '{', '}', '[', ']', '^', '~', '*',
             '?', ':', '"', ';', ' ', '/']

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

    if field in hidden_fields:
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
    response = full_response.content

    return response


def get_owner_from_assay(uuid):
    # Returns the owner from an assay_uuid. Ownership is passed from dataset

    try:
        investigation_key = Study.objects.get(assay__uuid=uuid).investigation
    except ObjectDoesNotExist:
        return "Error: Invalid uuid"

    investigation_link = core.models.InvestigationLink.objects.get(
            investigation=investigation_key)
    owner = core.models.DataSet.objects.get(
            investigationlink=investigation_link).get_owner()

    return owner


def format_solr_response(solr_response):
    # Returns a reformatted solr response
    try:
        solr_response_json = json.loads(solr_response)
    except TypeError:
        return "Error loading json."

    # Reorganizes solr response into easier to digest objects.
    order_facet_fields = solr_response_json.get('responseHeader').get(
            'params').get('fl').split(',')
    facet_field_counts = solr_response_json.get('facet_counts').get(
            'facet_fields')
    facet_field_docs = solr_response_json.get('response').get('docs')
    facet_field_docs_count = solr_response_json.get('response').get('numFound')
    facet_field_counts_obj = objectify_facet_field_counts(facet_field_counts)
    solr_response_json['facet_field_counts'] = facet_field_counts_obj
    attributes = customize_attribute_response(order_facet_fields)
    solr_response_json["attributes"] = attributes
    solr_response_json["nodes"] = facet_field_docs
    solr_response_json["nodes_count"] = facet_field_docs_count

    # Remove unused fields from solr response
    del solr_response_json['responseHeader']
    del solr_response_json['facet_counts']
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
