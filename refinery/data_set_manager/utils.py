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
import collections

from django.db.models import Q
from django.utils.http import urlquote
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist

from data_set_manager.models import Node, Attribute, AnnotatedNode, Study, \
    Assay, AnnotatedNodeRegistry
from data_set_manager.search_indexes import NodeIndex
from core.models import DataSet, InvestigationLink
from .models import AttributeOrder, Study, Investigation
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


def _get_parent_attributes(result, node):
    attributes = []

    if len(result[node]["parents"]) == 0:
        return result[node]["attributes"]

    for parent in result[node]["parents"]:
        attributes.extend(_get_parent_attributes(result, parent))

    attributes.extend(result[node]["attributes"])
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
    a = [node["attributes"] for node_id, node in nodes.iteritems()]
    logger.info(a)
    # insert node and attribute information
    start = time.time()
    counter = 0
    bulk_list = []
    for node_id, node in nodes.iteritems():
        if node["type"] == node_type:
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
        start - paginate, offset response
        limit/row - maximum number of documents
        field_limit - set of fields to return
        facet_field - specify a field which should be treated as a facet
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
    start = params.get('start', default='0')
    row = params.get('limit', default='20')
    field_limit = params.get('attributes', default=None)
    facet_field = params.get('facets', default=None)
    facet_pivot = params.get('pivots', default=None)
    sort = params.get('sort', default=None)

    fixed_solr_params = \
        '&'.join([file_types,
                  'fq=is_annotation:%s' % is_annotation,
                  'start=%s' % start,
                  'rows=%s' % row,
                  'q=django_ct:data_set_manager.node&wt=json',
                  'facet=%s' % facet_count,
                  'facet.limit=-1',
                  'facet.mincount=1'
                  ])

    solr_params = ''.join(['fq=assay_uuid:', assay_uuid])

    if facet_field:
        split_facet_fields = generate_facet_fields_query(
                facet_field.split(','))
        solr_params = ''.join([solr_params, split_facet_fields])
    else:
        # Missing facet_fields, it is generated from Attribute Order Model.
        attributes_str = AttributeOrder.objects.filter(assay__uuid=assay_uuid)
        attributes = AttributeOrderSerializer(attributes_str, many=True)
        facet_field = generate_filtered_facet_fields(attributes.data)
        facet_field_query = generate_facet_fields_query(facet_field)
        solr_params = ''.join([solr_params, facet_field_query])

    if field_limit:
        solr_params = ''.join([solr_params, '&fl=', field_limit])
    else:
        # create field_limit from facet_fields
        field_limit = ','.join(facet_field)
        solr_params = ''.join([solr_params, '&fl=', field_limit])

    if facet_pivot:
        solr_params = ''.join([solr_params, '&facet.pivot=', facet_pivot])

    if sort:
        solr_params = ''.join([solr_params, '&sort=', sort])

    url = '&'.join([solr_params, fixed_solr_params])
    encoded_solr_params = urlquote(url, safe='=& ')

    return encoded_solr_params


def hide_fields_from_weighted_list(weighted_facet_obj):
    """Returns a filtered facet field list from a weighted facet object."""
    hidden_fields = ["uuid", "id", "django_id", "file_uuid", "study_uuid",
                     "assay_uuid", "type", "is_annotation", "species",
                     "genome_build", "name", "django_ct"]

    filtered_facet_list = []
    for (rank, field) in weighted_facet_obj:
        solr_field = field.get("solr_field")
        if solr_field not in hidden_fields:
            filtered_facet_list.append(solr_field)

    return filtered_facet_list


def generate_filtered_facet_fields(attributes):
    """ Returns a filter facet field list. Attribute order contains whether
    facets should be used."""

    weighted_list = []
    for field in attributes:
        if field.get("is_exposed") and field.get("is_facet"):
            weighted_list.append((int(field["rank"]), field))

    weighted_list.sort()
    filtered_facet_fields = hide_fields_from_weighted_list(weighted_list)

    return filtered_facet_fields


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
    # Returns an owner name from an assay_uuid. Ownership is passed down from
    try:
        investigation_key = Study.objects.get(assay__uuid=uuid).investigation
    except ObjectDoesNotExist:
        return "Error: Invalid uuid"

    investigation_link = InvestigationLink.objects.get(
            investigation=investigation_key)
    owner = DataSet.objects.get(
            investigationlink=investigation_link).get_owner()

    return owner


def format_solr_response(solr_response):
    # Returns a reformatted solr response
    try:
        solr_response_json = json.loads(solr_response)
    except TypeError:
        return "Error loading json."

    order_facet_fields = solr_response_json.get('responseHeader').get(
            'params').get('facet.field')
    facet_field_counts = solr_response_json.get('facet_counts').get(
            'facet_fields')
    facet_field_docs = solr_response_json.get('response').get('docs')
    solr_response_json['facet_field_counts'] = facet_field_counts
    attributes = customize_attribute_response(order_facet_fields)
    solr_response_json["attributes"] = attributes
    solr_response_json["nodes"] = facet_field_docs
    del solr_response_json['responseHeader']
    del solr_response_json['facet_counts']
    del solr_response_json['response']

    return solr_response_json


def customize_attribute_response(facet_fields):
    # Returns an array of attribute objects based on parsing the title
    attribute_array = []
    for field in facet_fields:
        customized_field = {'internal_name': field}

        field_name = field.split('_')
        customized_field['datatype'] = field_name[-1]

        if 'REFINERY_SUBANALYSIS' in field:
            customized_field['display_name'] = 'Analysis Group'
        elif 'REFINERY_WORKFLOW_OUTPUT' in field:
            customized_field['display_name'] = 'Output Type'
        elif 'FILETYPE' in field:
            customized_field['display_name'] = 'File Type'
        elif 'REFINERY' in field:
            customized_field['display_name'] = field_name[1].title()
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

    return "Successful update"
