'''
Created on Jan 11, 2012

@author: Nils Gehlenborg, Harvard Medical School, nils@hms.harvard.edu
'''


import logging

import networkx as nx

logger = logging.getLogger(__name__)


def create_expanded_workflow_graph(galaxy_workflow_dict):
    graph = nx.MultiDiGraph()
    steps = galaxy_workflow_dict["steps"]

    # iterate over steps to create nodes
    for current_node_id, step in steps.iteritems():
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        # create node
        graph.add_node(current_node_id)
        # add node attributes
        graph.node[current_node_id]['name'] = "{}:{}".format(
            current_node_id,
            step['name']
        )
        graph.node[current_node_id]['tool_id'] = step['tool_id']
        graph.node[current_node_id]['type'] = step['type']
        graph.node[current_node_id]['position'] = (
            int(step['position']['left']), -int(step['position']['top'])
        )
        graph.node[current_node_id]['node'] = None
    # iterate over steps to create edges (this is done by looking at
    # input_connections, i.e. only by looking at tool nodes)
    for current_node_id, step in steps.iteritems():
        # ensure node id is an integer
        current_node_id = int(current_node_id)
        input_connections = step['input_connections'].iteritems()
        for current_node_input_name, input_connection in input_connections:
            parent_node_id = input_connection["id"]
            # test if parent node is a tool node or an input node to pick the
            # right name for the outgoing edge
            if parent_node_id == 0:
                # Workflows created in Galaxy >= 17.05 don't return
                # data about the "inputs" of their input step anymore,
                # which makes sense. We still need this info to complete
                # our workflow graph structure though
                parent_step = steps[str(parent_node_id)]
                parent_node_output_name = parent_step["name"].title()
            else:
                parent_node_output_name = input_connection['output_name']
            edge_output_id = "{}_{}".format(
                parent_node_id,
                parent_node_output_name
            )
            edge_input_id = "{}_{}".format(
                current_node_id,
                current_node_input_name
            )
            edge_id = "{}___{}".format(edge_output_id, edge_input_id)
            graph.add_edge(parent_node_id, current_node_id, key=edge_id)
            graph[parent_node_id][current_node_id]['output_id'] = (
                edge_output_id
            )
            graph[parent_node_id][current_node_id]['input_id'] = edge_input_id
    return graph
