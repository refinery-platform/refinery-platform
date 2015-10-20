/*
 * Refinery Workflow visualization
 * d3.js script
 * (c) Stefan Luger 2013 - 2014
 */

// js module pattern
workflowVisualizationModule = function () {

    // #################################################################
    // ########## GLOBAL MEMBERS #######################################
    // #################################################################

    var canvas = null,
        zoom = null,
        force = {},
        shape_dim = null,
        layout_prop = null,
        table = null, // properties table
        dataset = null, // actual dataset
        in_nodes = null,
        out_nodes = null,
        layout = document.getElementById("cb_layout_kind_refinery").checked ? "1" : "0";


    // #################################################################
    // ########## WORKFLOW LOADER ######################################
    // #################################################################

    /*
     * deletes the svg elements and current displayed table
     */
    var clear_svg = function () {
        if (canvas) {
            d3.select(canvas).selectAll(".link").remove();
            d3.select(canvas).selectAll(".node").remove();
            d3.select(canvas).selectAll("svg").remove();
        }
        d3.select("#workflowtbl").remove();

        canvas = null;
        force = {};
        zoom = null;
        shape_dim = null;
        layout_prop = null;
        table = null; // properties table
        dataset = null; // actual dataset
        in_nodes = null;
        out_nodes = null;
        layout = document.getElementById("cb_layout_kind_refinery").checked ? "1" : "0";
    };

    /*
     * reloads the whole workflow visualization from scratch through the visualize_workflow function
     */
    var reload_workflowPrivate = function (workflowUrl) {
        clear_svg();

        canvas = init_canvas("#vis_workflow");
        shape_dim = init_dimensions(60, 30, 50, 11, 50, 6);
        layout_prop = init_force_layout(100, 1, 0.9, -100, 0.8, 0.0);

        d3.json(workflowUrl, function (error, data) {
            visualize_workflow(data, canvas)
        });

        return false;
    };

    /*
     * toggle visibility of table via button click
     *
     * id: id of the div element to be toggled
     */
    var toggle_visibilityPrivate = function (id) {
        var element = document.getElementById(id);

        if (element.style.display == "block")
            element.style.display = "none";
        else
            element.style.display = "block";
    };

    // refinery injection for the workflow visualization
    var runWorkflowVisualizationPrivate = function (workflowUrl) {
        // initialize svg to body
        canvas = init_canvas("#vis_workflow");

        // initialize window and shape dimensions
        shape_dim = init_dimensions(60, 30, 50, 11, 50, 6);

        // initialize force layout properties
        layout_prop = init_force_layout(100, 1, 0.9, -100, 0.8, 0.0);

        // process and visualize workflow data from JSON file
        d3.json(workflowUrl, function (error, data) {
            visualize_workflow(data, canvas)
        });
    };


// #################################################################
// ########## ENUMS ################################################
// #################################################################

    // supported layouts
    var layout_kind = {
        GALAXY: "0",
        REFINERY: "1"
    };

    // distinguish whether the left or right side of a node is collapsed/expanded
    var layout_translation = {
        COLLAPSE_LEFT: 0,
        EXPAND_LEFT: 1,
        COLLAPSE_RIGHT: 2,
        EXPAND_RIGHT: 3
    };


// #################################################################
// ########## HELPERS ##############################################
// #################################################################

    /*
     * create custom tooltips
     *
     * args: contains name and value attributes for property
     * tt_id: node selector id
     */
    function createTooltip(args, tt_id) {
        return d3.tip()
            .attr("class", "file-tt")
            .attr("id", tt_id)
            .offset([-10, 0])
            .html(function () {
                var content = "";
                args.forEach(function (tt) {
                    content = content.concat("<strong>" + tt.name + "</strong> <span style='color:#fa9b30'>" + tt.value + "</span><br>");
                });
                return content;
            });
    }

    /*
     * remove global d3-tip tooltip
     *
     * node_selector: tooltip id grouped by node id
     */
    function removeGlobalTooltip(node_selector) {
        d3.select("body").selectAll(node_selector).remove();
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function node_input_con_circle_event(x) {
        if (!x.expanded_in_con) {
            x.expanded_in_con = true;
            dataset.columns[x.column].inputs += 1;

            if (dataset.columns[x.column].inputs === 1 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.EXPAND_LEFT);
            }

            d3.select(this.parentNode).selectAll(".nodeInputConG").each(function (z, j) {
                d3.select(this).append("rect")
                    .attr("class", "inputConRect")
                    .attr("x", function () {
                        return -shape_dim.node_io.offset - shape_dim.node_io.width;
                    })
                    .attr("y", function () {
                        return (shape_dim.node_io.height + 2) * (j + 1)
                            - get_input_conns_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - shape_dim.node_io.height;
                    })
                    .attr("width", shape_dim.node_io.width)
                    .attr("height", shape_dim.node_io.height)
                    .attr("rx", 1)
                    .attr("ry", 1)
                    .attr("fill", "lightsteelblue")
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1);

                // when path was highlighted before, fill rectangle orange
                var sel_path = d3.select(this.parentNode.parentNode)[0][0].__data__.subgraph[+d3.select(this).attr("id")[14]];
                if (sel_path[0].highlighted) {
                    d3.select(this).selectAll(".inputConRect")
                        .attr("fill", "orange");
                }

                // add file name
                d3.select(this).append("text")
                    .attr("class", "inputConRectTitle")
                    .text(function (d) {
                        return cut_io_file_name(d.output_name);
                    })
                    .attr("x", function () {
                        return -shape_dim.node_io.offset - shape_dim.node_io.width + 2 + shape_dim.circle.r;
                    })
                    .attr("y", function () {
                        return (shape_dim.node_io.height + 2) * (j + 1)
                            - get_input_conns_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - 3;
                    });

                // create moving anchors
                d3.select(this.parentNode).append("g")
                    .attr("class", "inputConRectCircleG")
                    .attr("transform", function () {
                        return "translate("
                            + parseInt(-shape_dim.node_io.offset - shape_dim.node_io.width, 10) + ","
                            + parseInt((shape_dim.node_io.height + 2) * (j + 1)
                                - get_input_conns_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - shape_dim.node_io.height / 2, 10) + ")"
                    })
                    .append("circle")
                    .attr("class", "inputConRectCircle")
                    .attr("r", shape_dim.circle.r)
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1.5)
                    .attr("fill", "lightsteelblue");

                // create tooltip
                var args = [];
                args.push({name: "id:", value: z.id});
                args.push({name: "output_name:", value: z.output_name});

                // create d3-tip tooltips
                var tip = createTooltip(args, "tt_id-" + x.id);

                // invoke tooltip on dom element
                d3.select(this).call(tip);
                d3.select(this).on("mouseover", tip.show)
                    .on("mouseout", tip.hide);
            });

            // hide input circle
            d3.select("#node_" + this.parentNode.__data__.id).select(".nodeInputConCircle").attr("opacity", 0);

            force.resume();
            update();
        }
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function node_output_circle_event(x) {
        if (!x.expanded_out) {
            x.expanded_out = true;
            dataset.columns[x.column].outputs += 1;

            if (dataset.columns[x.column].outputs === 1 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.EXPAND_RIGHT);
            }

            d3.select(this.parentNode).selectAll(".nodeOutputG").each(function (z, j) {
                d3.select(this).append("rect")
                    .attr("id", function () {
                        return "outputRect_" + j;
                    })
                    .attr("class", "outputRect")
                    .attr("x", function () {
                        return shape_dim.node_io.offset;
                    })
                    .attr("y", function () {
                        return (shape_dim.node_io.height + 2) * (j + 1)
                            - get_outputs_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - shape_dim.node_io.height;
                    })
                    .attr("width", shape_dim.node_io.width)
                    .attr("height", shape_dim.node_io.height)
                    .attr("rx", 1)
                    .attr("ry", 1)
                    .attr("fill", function () {
                        var color = "lightsteelblue";
                        // when path was highlighted before, fill rectangle orange
                        get_succ_links_by_node_id(this.parentNode.parentNode.__data__.id).forEach(function (l) {
                            if (l.highlighted && output_input_con_file_link(l)[0] === j) {
                                color = "orange";
                            }
                        });
                        return color;
                    })
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1);

                // add file name
                d3.select(this).append("text")
                    .attr("id", function () {
                        return "outRectTitle_" + j;
                    })
                    .attr("class", "outRectTitle")
                    .text(function (d) {
                        return cut_io_file_name(d.name);
                    })
                    .attr("x", shape_dim.node_io.offset + 2)
                    .attr("y", function () {
                        return (shape_dim.node_io.height + 2) * (j + 1)
                            - get_outputs_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - 3;
                    });

                // create moving anchors

                // files imported back to refinery
                // when name is key element of annotation properties,
                // rename it to its value element and display it in italic style
                // and add a steelblue filled circle to the right of the rect
                var anchor = d3.select(this).append("g")
                    .attr("class", "outRectCircleG")
                    .attr("transform", function () {
                        return "translate("
                            + parseInt(shape_dim.node_io.offset + shape_dim.node_io.width, 10) + ","
                            + parseInt((shape_dim.node_io.height + 2) * (j + 1)
                                - get_outputs_length(this.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2
                                - shape_dim.node_io.height / 2, 10) + ")"
                    });
                var anchor_circle = anchor.append("circle")
                    .attr("class", "outRectCircle")
                    .attr("r", shape_dim.circle.r)
                    .attr("stroke", "gray")
                    .attr("stroke-width", 1.5);

                var stored_output = check_stored_outputs(anchor_circle);

                // create tooltip
                var args = [];
                args.push({name: "name:", value: z.name});
                args.push({name: "type:", value: z.type});
                if (stored_output !== "undefined") {
                    args.push({name: "stored as:", value: stored_output});
                }

                // create d3-tip tooltips
                var tip = createTooltip(args, "tt_id-" + x.id);

                // invoke tooltip on dom element
                d3.select(this).call(tip);
                d3.select(this).on("mouseover", tip.show)
                    .on("mouseout", tip.hide);
            });

            force.resume();
            update();
        }
    }

    /*
     * event for expanding the left side of a node
     *
     * x: the anchor circle svg element
     */
    function node_input_circle_event(x) {
        var input_rect = null;

        if (!x.expanded_out) {
            x.expanded_out = true;
            dataset.columns[x.column].outputs += 1;

            if (dataset.columns[x.column].outputs === 1 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.EXPAND_RIGHT);
            }
            input_rect = d3.select(this.parentNode).select(".nodeInput").selectAll(".inputRectTitle");

            var input_rect_g = input_rect.data(function (d) {
                return dataset.steps[d.id].inputs;
            })
                .enter()
                .append("g");

            input_rect_g.append("rect")
                .attr("class", "inputRect")
                .attr("id", function (d, i) {
                    return "inputRect_" + i;
                })
                .attr("x", shape_dim.node_io.offset)
                .attr("y", function (d, i) {
                    return (shape_dim.node_io.height + 2) * (i + 1)
                        - get_inputs_length(this.parentNode.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - shape_dim.node_io.height;
                })
                .attr("width", shape_dim.node_io.width)
                .attr("height", shape_dim.node_io.height)
                .attr("rx", 1)
                .attr("ry", 1)
                .attr("fill", "lightsteelblue")
                .attr("stroke", "gray")
                .attr("stroke-width", 1);

            // when path was highlighted before, fill rectangle orange
            // get links via source id and for each link
            get_succ_links_by_node_id(x.id).forEach(function (l) {
                if (l.highlighted) {
                    d3.select("#node_" + l.source.id).select(".nodeInput").select("#inputRect_" + output_input_con_file_link(l)[0])
                        .attr("fill", "orange");
                }
            });

            // add file name
            input_rect_g
                .append("text")
                .attr("class", "inputRectTitle")
                .text(function (d) {
                    return cut_io_file_name(d.name);
                })
                .attr("x", shape_dim.node_io.offset + 2)
                .attr("y", function (d, i) {
                    return (shape_dim.node_io.height + 2) * (i + 1)
                        - get_inputs_length(this.parentNode.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2 - 3;
                });

            // create moving anchors
            input_rect_g
                .append("g")
                .attr("class", "inRectCircleG")
                .attr("transform", function (d, i) {
                    return "translate("
                        + parseInt(shape_dim.node_io.offset + shape_dim.node_io.width, 10) + ","
                        + parseInt((shape_dim.node_io.height + 2) * (i + 1)
                            - get_inputs_length(this.parentNode.parentNode.parentNode.__data__.id) * (shape_dim.node_io.height + 2) / 2
                            - shape_dim.node_io.height / 2, 10) + ")"
                })
                .append("circle")

                .attr("class", "inRectCircle")
                .attr("r", shape_dim.circle.r)
                .attr("stroke", "gray")
                .attr("stroke-width", 1.5)
                .attr("fill", "lightsteelblue");

            // create tooltip
            input_rect_g.each(function (d) {
                var args = [];
                args.push({name: "description:", value: d.description});
                args.push({name: "name:", value: d.name});

                // create d3-tip tooltips
                var tip = createTooltip(args, "tt_id-" + x.id);

                // invoke tooltip on dom element
                d3.select(this).call(tip);
                d3.select(this).on("mouseover", tip.show)
                    .on("mouseout", tip.hide);
            });

            // hide input circle
            d3.select("#node_" + this.parentNode.__data__.id).select(".nodeInputCircle").attr("opacity", 0);

            force.resume();
            update();
        }
    }

// TODO: magically the the height gets expanded by x when resizing the width or height of the window
    /*
     * adds responsiveness on window resize to the visualization
     *
     */
    function resize() {
        // calc new width after resize
        var new_width = parseInt(d3.select("#vis_workflow").style("width"), 10);
        var new_height = parseInt(d3.select("#vis_workflow").style("height"), 10);

        // set svg
        d3.select("#vis_workflow").select("svg")
            .attr("width", new_width + "px")
            .attr("height", new_height + "px");

        // set canvas
        canvas
            .attr("width", new_width + "px")
            .attr("height", new_height + "px");

        // update globals
        shape_dim.window.width = new_width;
        shape_dim.window.height = new_height;

        // update visualization
        //fit_wf_to_window(0);

        // update overlay
        d3.select(".overlay")
            .attr("x", -new_width + "px")
            .attr("y", -new_height + "px")
            .attr("width", new_width * 4 + "px")
            .attr("height", new_height * 4 + "px");
    }

    /*
     * create a circle left and right to the node for interaction purposes
     *
     * g_element: input_con, output, input
     * node: node of datastructure node
     * g_str: class name for the group element
     * element: the circle svg element appended
     * str: class name for the element
     * x_trans: translation in x direction
     *
     * returns the group element
     */
    function create_node_circle(g_element, node, g_str, str, x_trans) {

        // group element
        g_element = node.append("g").attr("transform", function () {
            return "translate(" + parseInt((x_trans), 10) + "," + 0 + ")";
        }).attr("class", g_str);

        // circle element
        g_element.append("circle")
            .attr("class", str)
            .attr("r", shape_dim.circle.r)
            .attr("stroke", "gray")
            .attr("stroke-width", 1.5)
            .attr("fill", "lightsteelblue");

        return g_element;
    }

    /*
     * for each output file of a node, stored outputs are checked
     *
     * output: a single output file of a node
     */
    function check_stored_outputs(output) {
        var cur_node_id = output[0][0].parentNode.parentNode.parentNode.__data__.id,
            cur_node = dataset.steps[cur_node_id],
            annoProperties = parse_node_annotation(cur_node.annotation),
            node_circle = d3.select("#node_" + cur_node_id).select(".nodeOutputCircle"),
            keys = annoProperties.map(function (k) {
                return k.key;
            }),
            values = annoProperties.map(function (v) {
                return v.value;
            });

        // fill stored outputs
        output.attr("fill", function (d) {
            return (keys.indexOf(d.name) !== -1) ? "steelblue" : "lightsteelblue";
        });

        // hide output circle
        node_circle.attr("opacity", 0);

        // rename files and stylize them italic
        var index = keys.indexOf(output[0][0].__data__.name),
            node_output_g = d3.select(output[0][0].parentNode.parentNode);

        // if current output file is stored in the key-value array
        if (index !== -1) {
            // rename and stylize italic
            node_output_g.select(".outRectTitle").text(cut_io_file_name(values[index])).attr("font-style", "italic");
            return values[index];
        } else {
            return "undefined";
        }
    }

    /*
     * dye circles if they contain stored outputs
     *
     * node: node of datastructure node
     */
    function dye_circles(node_id) {
        var node_circle = [],
            cur_node = dataset.steps[node_id],
            annoProperties = parse_node_annotation(cur_node.annotation);

        if (annoProperties.length !== 0) {
            node_circle = d3.select("#node_" + node_id).select(".nodeOutputCircle").select(".fileIconOutputCircle");
            node_circle.attr("fill", "steelblue");
        }
    }

    /*
     * clears highlighted links, nodes and inputcon rects
     *
     * link: link datastructure after the force layout is executed
     */
    function clear_highlighting(link) {
        var sel_path = [],
            sel_node_rect = null,
            sel_path_rect = null;

        link.each(function (l) {
            sel_path.push(l);
        });

        // for every link
        dye_path(sel_path, sel_node_rect, sel_path_rect, "gray", 1.5, "lightsteelblue", false);

        // for each out_node
        out_nodes.forEach(function (y) {
            dye_node(y, "gray", 1.5, "lightsteelblue");
        });
    }

    /*
     * fits the current workflow to the window
     *
     * transitionTime: specify the ms when a transition occurs, with 0 no transition is executed
     */
    function fit_wf_to_window(transitionTime) {
        var min = [d3.min(dataset.nodes, function (d) {
                return d.x;
            }), d3.min(dataset.nodes, function (d) {
                return d.y;
            })],
            max = [d3.max(dataset.nodes, function (d) {
                return d.x;
            }), d3.max(dataset.nodes, function (d) {
                return d.y;
            })],
            delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(shape_dim.window.width - shape_dim.margin.left * 4) / delta[0],
                    (shape_dim.window.height - shape_dim.margin.top * 4) / delta[1]],
        // old_pos = zoom.translate(),
            new_scale = d3.min(factor.concat([2])),// limit fit to window zoom level to 2.
            new_pos = [((shape_dim.window.width - shape_dim.margin.left - delta[0] * new_scale) / 2),
                ((shape_dim.window.height - shape_dim.margin.left - delta[1] * new_scale) / 2)];

        new_pos[0] -= min[0] * new_scale;
        new_pos[1] -= min[1] * new_scale;

        if (transitionTime !== 0) {
            canvas
                .transition()
                .duration(1000)
                .attr("transform", "translate(" + new_pos + ")scale(" + new_scale + ")");
        } else {
            canvas.attr("transform", "translate(" + new_pos + ")scale(" + new_scale + ")");
        }

        zoom.translate(new_pos);
        zoom.scale(new_scale);
    }

// TODO: generalize for all attributes
    /*
     * calculates column order through links of nodes
     *
     * node: the current node with datastructure node
     */
    function calc_columns(node) {
        var succs = get_succ_nodes_by_node(node);

        // for each successor
        succs.forEach(function (x) {
            // check predecessors visited
            var preds = get_pred_nodes_by_node(x);
            var max_col = 0;
            var all_visited = true;
            preds.forEach(function (y) {
                if (y.visited) {
                    if (y.column > max_col) {
                        max_col = y.column;
                    }
                } else {
                    // only if one predecessor wasn't written, start backtracking
                    all_visited = false;
                }
            });

            if (all_visited) {
                x.column = max_col + 1;
                x.visited = true;
                calc_columns(x);
            }

        });
    }

    /*
     * shift specific nodes by rows
     *
     * row_shift: number of rows to shift
     * col: for nodes up to column
     * row: for nodes from row
     */
    function shift_nodes_by_rows(row_shift, col, row) {
        get_nodes_by_column_range(0, col).forEach(function (d) {
            if (d.row >= row) {
                d.row += row_shift;
            }
        });
    }

    /*
     * get number of nodes visited already
     *
     * arr: an array of nodes
     * returns the number of nodes visited already
     */
    function get_number_of_visited_nodes_by_arr(nodes) {
        var count = 0;

        nodes.forEach(function (id) {
            if (dataset.nodes[id].visited) {
                count++;
            }
        });

        return count;
    }

    /*
     * gets all predecessor nodes for a node
     *
     * node: node of datastructure nodes
     * returns a set of nodes
     */
    function get_pred_nodes_by_node(node) {
        var pred_links = [],
            pred_nodes = [];

        dataset.links.forEach(function (link) {
            if (link.target === node.id) {
                pred_links.push(link);
            }
        });

        pred_links.forEach(function (link) {
            pred_nodes.push(dataset.nodes[link.source]);
        });

        return pred_nodes;
    }

    /*
     * gets all successor nodes for a node
     *
     * node: node of datastructure nodes
     * returns a set of nodes
     */
    function get_succ_nodes_by_node(node) {
        var succ_links = [],
            succ_nodes = [];

        dataset.links.forEach(function (link) {
            if (link.source === node.id) {
                succ_links.push(link);
            }
        });

        succ_links.forEach(function (link) {
            succ_nodes.push(dataset.nodes[link.target]);
        });

        return succ_nodes;
    }

    /*
     * get nodes of columns from begin to end column id
     *
     * begin: column according to grid layout
     * end: (including) column according to grid layout
     * returns a set of nodes
     */
    function get_nodes_by_column_range(begin, end) {
        var nodes_to_translate = [];

        dataset.nodes.forEach(function (node) {
            if (node.column >= begin && node.column <= end) {
                nodes_to_translate.push(node);
            }
        });

        return nodes_to_translate;
    }

    /*
     * collapse/expand the left/right side of a column
     *
     * col: column according to grid layout
     * action: enum for the specific translation
     */
    function update_column_translation(col, action) {
        var nodes_to_translate = [];

        // LEFT SIDE - get nodes to the left
        if (action === layout_translation.COLLAPSE_LEFT || action === layout_translation.EXPAND_LEFT) {
            nodes_to_translate = get_nodes_by_column_range(0, col - 1);

            nodes_to_translate.forEach(function (node) {
                // translate nodes in columns to the left in pos x direction
                if (action === layout_translation.COLLAPSE_LEFT) {
                    node.px += shape_dim.column.delta_x;
                    // translate nodes in columns to the left in neg x direction
                } else {
                    node.px -= shape_dim.column.delta_x;
                }
            });
        }
        // RIGHT SIDE - get nodes to the right
        else {
            nodes_to_translate = get_nodes_by_column_range(col + 1, dataset.graph_depth);

            nodes_to_translate.forEach(function (node) {
                // translate nodes in columns to the right in neg x direction
                if (action === layout_translation.COLLAPSE_RIGHT) {
                    node.px -= shape_dim.column.delta_x;
                    // translate nodes in columns to the right in pos x direction
                } else {
                    node.px += shape_dim.column.delta_x;
                }
            });
        }
    }

    /*
     * get nodes by column
     *
     * col: column according to grid layout
     * returns a set of nodes
     */
    function get_nodes_by_col(col) {
        var col_nodes = [];
        dataset.nodes.forEach(function (node) {
            if (node.column === col) {
                col_nodes.push(node);
            }
        });
        return col_nodes;
    }

    /*
     * get all output nodes, the nodes without a successor
     *
     * returns a set of output nodes
     */
    function get_output_nodes() {
        var output_nodes = [];

        dataset.nodes.forEach(function (node) {
            if (node.type === "output") {
                output_nodes.push(node);
            }
        });

        return output_nodes;
    }

    /*
     * get all input nodes, the nodes without a predecessor
     *
     * returns a set of input nodes
     */
    function get_input_nodes() {
        var input_nodes = [];

        dataset.nodes.forEach(function (node) {
            if (node.type === "input") {
                input_nodes.push(node);
            }
        });

        return input_nodes;
    }

    /*
     * set the width of a graph by counting the leaf-nodes
     *
     * returns the number of nodes leaf-nodes
     */
    function set_graph_width() {
        dataset.graph_width = get_output_nodes().length;
    }

    /*
     * traverse the tree dfs by a given node id and set the depth for the graph
     *
     * cur_node: the current node in the traversal process
     * path_depth: the accumulated path length for the current recursion depth
     */
    function traverse_dfs(cur_node, path_depth) {
        var preds = [];
        dataset.links.forEach(function (link) {
            if (link.target === cur_node.id) {
                preds.push(link);
            }
        });

        if (cur_node.type === "input") {
            if (path_depth > dataset.graph_depth) {
                dataset.graph_depth = path_depth;
            }
        } else {
            preds.forEach(function (link) {
                traverse_dfs(dataset.nodes[link.source], (+path_depth) + 1);
            });
        }
    }

    /*
     * set the longest path of the graph by finding a maximum path
     */
    function set_graph_depth() {
        get_output_nodes().forEach(function (d) {
            traverse_dfs(d, 1);
        });
    }

    /*
     * cuts the input, output and input_con file name regarding the width of io_node rectangles
     *
     * str: the full string
     * returns the cut string to display
     */
    function cut_io_file_name(str) {
        if (str.length > shape_dim.node_io.width / 5) {
            str = str.substring(0, 9) + "..";
        }

        return str;
    }

    /*
     * calculates the length of the node title and splits into two text elements, cuts it if
     * it is too long and adds a tooltip
     *
     * d: node
     */
    function node_title() {
        var text_size = [],
            node_name = [],
            char_size = [],
            chars_per_row = [],
            delimiter = [],
            delimiter_pos_char = 0,
            line_break_pos = 0;

        delimiter = [' ', '-', '\/', '\\', ':', '.', '_', ',', ';'];

        // create a svg element for the full string
        this[0].forEach(function (x, i) {
            d3.select(x).append("text")
                .attr("class", "nodeTitle1")
                .attr("x", 0)
                .attr("y", 0)
                .text(function () {
                    return dataset.steps[i].name;
                })
        });

        // break first line if necessary with line breaks on
        this[0].forEach(function (x, i) {
            d3.select(x).select(".nodeTitle1")
                .text(function (d) {
                    text_size[i] = this.getComputedTextLength() + parseInt(shape_dim.node.title_margin, 10);
                    node_name[i] = dataset.steps[d.id].name;
                    char_size[i] = text_size[i] / node_name[i].length;
                    chars_per_row[i] = parseInt(Math.floor(shape_dim.node.width / char_size[i]), 10);
                    line_break_pos = chars_per_row[i];

                    if (node_name[i].length > chars_per_row[i] + 1) {
                        delimiter_pos_char = node_name[i][parseInt(chars_per_row[i], 10)];

                        // check for linebreak
                        if (node_name[i].length > chars_per_row[i] + 1 && (delimiter.indexOf(delimiter_pos_char) === -1)) {

                            var cur = 0,
                                max = 0;
                            delimiter.forEach(function (c) {
                                cur = node_name[i].substring(0, chars_per_row[i]).lastIndexOf(c);
                                if (cur > max) {
                                    max = cur;
                                }
                            });
                            line_break_pos = max;

                            if (line_break_pos === 0) {
                                line_break_pos = chars_per_row[i];
                                return node_name[i].substring(0, chars_per_row[i] + 1) + '-';
                            } else {
                                return node_name[i].substring(0, line_break_pos + 1);
                            }
                        } else {
                            return node_name[i].substring(0, chars_per_row[i] + 1);
                        }
                    } else {
                        return node_name[i];
                    }
                })
                .attr("text-anchor", "middle")
                .attr("y", function () {
                    if (node_name[i].length > chars_per_row[i] + 1) {
                        return "12";
                    } else {
                        return shape_dim.node.height / 2 + 4;
                    }
                });

            // add a second line if necessary
            if (node_name[i].length > chars_per_row[i] + 1) {
                d3.select(x).append("text")
                    .attr("class", "nodeTitle2")
                    .attr("x", 0)
                    .attr("y", 12)
                    .text(function () {
                        if ((node_name[i].length - (line_break_pos + 1)) < chars_per_row[i]) {
                            return node_name[i].substring(line_break_pos + 1, node_name[i].length);
                        } else {
                            // if string is still too long, add points
                            return node_name[i].substring(line_break_pos + 1, line_break_pos + chars_per_row[i] - 1) + "..";
                        }
                    })
                    .attr("text-anchor", "middle")
                    .attr("y", 24);
            }
        });
    }

    /*
     * dyes a single node
     *
     * node: the node of datastructure node
     * stroke: border color
     * stroke_width: border width
     * fill: fill color
     */
    function dye_node(node, stroke, stroke_width, fill) {
        var node_rect = d3.select("#node_" + node.id);

        node_rect.select(".nodeRect")
            .attr("stroke", stroke)
            .attr("stroke-width", stroke_width);

        node_rect.selectAll(".inputConRect")
            .attr("fill", fill);
    }

    /*
     * dyes a path beginning at the selected node triggered via the path selection
     *
     * sel_path: the selected path consisting of links
     * sel_node_rect: the svg element of the selected node
     * sel_path_rect: an array of svg elements of the predecessing links within the path
     * stroke: border color
     * stroke_width: border width
     * fill: fill color
     */
    function dye_path(sel_path, sel_node_rect, sel_path_rect, stroke, stroke_width, fill, highlighted) {

        // this node
        if (sel_node_rect !== null) {
            sel_node_rect
                .attr("stroke", stroke)
                .attr("stroke-width", stroke_width);
        }
        if (sel_path_rect !== null) {
            sel_path_rect
                .attr("fill", fill);
        }

        // links and source nodes for the selected path
        sel_path.forEach(function (l) {
            l.highlighted = highlighted;

            d3.select("#" + l.id)
                .attr("stroke", stroke)
                .attr("stroke-width", stroke_width);

            d3.select("#node_" + l.source.id).select(".nodeRect")
                .attr("stroke", stroke)
                .attr("stroke-width", stroke_width);

            d3.select("#node_" + l.source.id).selectAll(".inputConRect")
                .attr("fill", fill);

            d3.select("#node_" + l.source.id).select(".nodeOutput").select("#outputRect_" + output_input_con_file_link(l)[0])
                .attr("fill", fill);

            d3.select("#node_" + l.source.id).selectAll(".inputRect")
                .attr("fill", fill);
        });
    }

    /*
     * get all links by a given source node id
     *
     * id: source node id
     * returns array of links
     */
    function get_succ_links_by_node_id(id) {
        var links = [];
        dataset.links.forEach(function (x) {
            if (x.source.id === id) {
                links.push(x);
            }
        });
        return links;
    }

    /* extracts all possible paths(links) via backtracking to root nodes starting with the selected node id
     *
     * id: selected node id
     * subgraph: an array of paths
     * cur_path_id: path index
     * cur_node_id: current node id
     * sub_path_length: length of branch until a split
     */
    function get_subgraph_by_id(id, subgraph, cur_path_id, cur_node_id, sub_path_length) {
        var preds = [];
        dataset.links.forEach(function (link) {
            if (link.target === cur_node_id) {
                preds.push(link);
            }
        });

        if (preds.length > 0) {
            // foreach predecessor
            preds.forEach(function (x) {
                // origin of path has two or more branches
                if (x.target === id) {
                    cur_path_id++;
                    subgraph.push([]);
                }

                // push current link to current path
                subgraph[cur_path_id].push(x);
                // and execute recursion with source id of the current link as current node id
                get_subgraph_by_id(id, subgraph, cur_path_id, x.source, ++sub_path_length);
            });
        }
        // otherwise, the current node id is a root node, and we leave this recursion branch
    }

    /*
     * gets target nodes by a given source id
     *
     * src_id: source node id
     * returns array of node ids representing target nodes
     */
    function get_succ_nodes_by_node_id(src_id) {
        var succs = [];

        dataset.links.forEach(function (x) {
            if (x.source == src_id) {
                succs.push(x.target);
            }
        });

        return succs;
    }

    /*
     * get the length of the inputs array for an integer id of a node
     *
     * node_id: node id integer
     * returns the number of inputs of the node
     */
    function get_inputs_length(node_id) {
        return dataset.steps[node_id].inputs.length;
    }

    /*
     * get the length of the input_connections array for an integer id of a node
     *
     * node_id: node id integer
     * returns the number of input_connections of the node
     */
    function get_input_conns_length(node_id) {
        return d3.values(dataset.steps[node_id].input_connections).length;
    }

    /*
     * get the length of the outputs array for an integer id of a node
     *
     * node_id: node id integer
     * returns the number of outputs of the node
     */
    function get_outputs_length(node_id) {
        return dataset.steps[node_id].outputs.length;
    }

    /*
     * get index pair of the outputs elem and input_connections elem for each link between two nodes
     *
     * link: contains source and target node
     * returns the linked index pair of outputs elem and input_connections elem
     */
    function output_input_con_file_link(link) {
        var iSrcOut = 0,
            jTarIn = 0;

        if (typeof link.source.id !== "undefined" && typeof dataset.steps[link.source.id] !== "undefined") {
            dataset.steps[link.source.id].outputs.some(function (x, i) {	// source node
                d3.values(dataset.steps[link.target.id].input_connections).some(function (y, j) {	// target node
                    if (x.name == y.output_name && link.source.id == y.id) {
                        iSrcOut = i;
                        jTarIn = j;
                    }
                });
            });
        }

        return [iSrcOut, jTarIn];
    }

    /*
     * similar to output_input_con_file_link but for links where the source node is of type input
     *
     * link: contains source and target node
     * returns the linked index pair of input elem and input_connections elem
     */
    function input_input_con_file_link(link) {
        var iSrcOut = 0,
            jTarIn = 0;

        if (typeof link.source.id !== "undefined" && typeof dataset.steps[link.source.id] !== "undefined") {
            d3.values(dataset.steps[link.target.id].input_connections).some(function (y, j) {	// target node
                if (link.source.id == y.id) {
                    jTarIn = j;
                }
            });
        }

        return [iSrcOut, jTarIn];
    }

    /*
     * checks whether an array contains a given integer element
     *
     * arr: the array (e.g. links)
     * node_id: the element (e.g. node id)
     * returns true if the array contains the element
     */
    function src_elem_in_arr(arr, node_id) {
        var found = false;

        arr.some(function (d) {
            if (+d.source === +node_id) {
                found = true;
            }
        });

        return found;
    }

    /*
     * adds zoom behavior to the top svg root element
     */
    function geometric_zoom() {
        canvas.attr("transform", "translate(" + d3.event.translate[0] + "," + d3.event.translate[1] + ")scale(" + (d3.event.scale) + ")");
    }

    /*
     * dragging start behavior for the force layout
     *
     * d: node which gets dragged
     */
    function dragstart() {
        d3.event.sourceEvent.stopPropagation();
    }

    /*
     * dragging end behavior for the force layout
     *
     * d: node which gets dragged
     */
    function dragend() {

    }

// #################################################################
// ########## INITIALIZATIONS ######################################
// #################################################################

// TODO: fix height growing issue
    /*
     * initializes a svg canvas root element and sets an id
     * if no width and height is specified, the proportions are set automatically
     *
     * div_id required for deletion
     * width, height: proportions
     * returns the actual generated svg canvas
     */
    function init_canvas(div_id) {
        canvas = d3.select(div_id).append("svg")
            .attr("width", d3.select("#vis_workflow").style("width"))
            .attr("height", function () {
                return window.innerHeight * 0.8 + "px"
            })
            .append("g");

        return canvas;
    }

    /*
     * initializes the most important svg element shape dimension properties
     *
     * node_width, node_height: the proportions of a node
     * io_width, io_height, io_offset: proportions of in- and output files attached to a node
     * margin for the svg canvas
     * returns the proportions for global storing purposes
     */
    function init_dimensions(node_width, node_height, io_width, io_height, margin, io_offset) {
        return {
            window: {width: parseInt(d3.select("#vis_workflow").style("width"), 10), height: parseInt(d3.select("#vis_workflow").style("height"), 10)},
            node: {width: node_width, height: node_height, title_margin: 30},
            node_io: {width: io_width, height: io_height, offset: io_offset},
            margin: {left: margin, top: margin, right: margin, bottom: margin},
            circle: {r: node_height / 6},
            column: {width: node_width * 1.7, delta_x: io_width + io_offset},
            row: {height: node_height * 2}
        };
    }

    /*
     * initializes force layout with given attributes
     *
     * for parameters explanation please lookup: https://github.com/mbostock/d3/wiki/Force-Layout#wiki-force
     *
     * returns the layout data structure
     */
    function init_force_layout(link_distance, link_strength, friction, charge, theta, gravity) {
        return {
            size: [shape_dim.window.width, shape_dim.window.height],
            link_distance: link_distance,
            link_strength: link_strength,
            friction: friction,
            charge: charge,
            theta: theta,
            gravity: gravity
        };
    }

// #################################################################
// ########## TABLE HELPERS ########################################
// #################################################################

    /*
     * creates a table on click
     *
     * node: node datastructure of dataset after the force layout is executed
     */
    function create_table(node) {
        // add new table on click
        var table = d3.select("#node_table"),
            prop_tbl = table.append("table").attr("id", "workflowtbl").classed("table table-bordered table-condensed table-responsive", true),
            tbody = prop_tbl.append("tbody"),
            tableEntries = [];

        // generate two-dimensional array dataset
        d3.entries(dataset.steps[node.id]).forEach(function (y) {
            switch (y.key) {
                case "name":
                case "tool_id":
                case "tool_version":
                case "tool_state":
                case "annotation":
                    tableEntries.push([y.key, y.value]);
                    break;
            }
        });

        // nested tr-td selection for actual entries
        var tr = tbody.selectAll("tr")
            .data(tableEntries)
            .enter()
            .append("tr");

        var td = tr.selectAll("td")
            .data(function (d) {
                return d;
            })
            .enter()
            .append("td")
            .call(eval_node_params);
    }

    /*
     * resolve nested object within the tool state elements
     *
     * parent: the parent cell
     */
    function create_nested_recursive_tool_state_table(parent, properties) {
        var obj = d3.entries(properties),
            td = parent.append("table")
                .classed("table table-condensed", true)
                .classed("table-bordered", false)
                .append("tbody").selectAll("tr")
                .data(obj)
                .enter()
                .append("tr")
                .selectAll("td")
                .data(function (d) {
                    return [d.key, d.value];
                })
                .enter()
                .append("td");

        // if data data contains another nested object, call recursively
        // if not, just add the text to td
        td.each(function (d) {
            if (typeof d === "object") {
                create_nested_recursive_tool_state_table(d3.select(this), d);
            } else {
                d3.select(this).text(function (d) {
                    return d;
                });
            }
        });
    }

    /*
     * appends a table to its parent element
     * for tool state node element
     *
     * parent: html table cell element (parent table)
     */
    function create_nested_tool_state_table(parent) {
        var text = parent[0][0].__data__;

        // prepare json
        text = text.replace(/\\/g, "");
        text = text.replace(/\"\{\"/g, "\{\"");
        text = text.replace(/\"\}\"/g, "\"\}");
        text = text.replace(/\"\"/g, "\"");
        text = text.replace(/\}\",/g, "\},");
        text = text.replace(/\}\"/g, "\}");

        // eliminate __xxxx__ parameters
        text = text.replace(/\"__(\S*)__\":\s{1}\d*(,\s{1})?/g, "");
        text = text.replace(/,\s{1}null/g, "");
        text = text.replace(/,\s{1}\}/g, "\}");

        // transform to json object
        var json_data = JSON.parse(text);
        var obj = d3.entries(json_data);

        // add nested table
        var td = parent.append("table")
            .classed("table table-condensed", true)
            .classed("table-bordered", false)
            .append("tbody").selectAll("tr")
            .data(obj)
            .enter()
            // add table row
            .append("tr")
            .selectAll("td")
            .data(function (d) {
                return [d.key, d.value]
            })
            .enter()
            // add table data
            .append("td");

        // if data data contains another nested object, call recursively
        // if not, just add the text to td
        td.each(function (d) {
            if (typeof d === "object") {
                create_nested_recursive_tool_state_table(d3.select(this), d);
            } else {
                d3.select(this).text(function (d) {
                    return d;
                });
            }
        });
    }

    /*
     * parses a string for its annotation parameters via regex
     *
     * text: string
     */
    function parse_node_annotation(text) {
        var annoProperties = [];

        if (text.length !== 0 && typeof text !== "undefined") {
            var json_set = JSON.parse(d3.values(text).join("")),
                kv_set = d3.entries(json_set);

            kv_set.forEach(function (a) {
                annoProperties.push({key: a.key, value: (a.value.name + "." + a.value.type + "\n" + a.value.description).toString()});
            });
        }

        return annoProperties;
    }

// TODO: fix table width / overflow
    /*
     * appends a table to its parent element
     * for annotation node element
     *
     * parent: html table cell element (parent table)
     * returns: a key-value-pair list of annotation files
     */
    function create_nested_annotation_table(parent) {
        var text = parent[0][0].__data__,
            annoProperties = parse_node_annotation(text);

        if (typeof parent !== "undefined") {
            parent.append("table")
                .classed("table table-condensed", true)
                .classed("table-bordered", false)
                .append("tbody").selectAll("tr")
                .data(annoProperties)
                .enter()
                .append("tr")
                .selectAll("td")
                .data(function (d) {
                    return [d.key, d.value];
                })
                .enter()
                .append("td")
                .text(function (d) {
                    return d;
                });
        }
    }

    /*
     * evaluates the node parameters for the table view
     *
     * tr: table row html element containing two tds
     *
     */
    function eval_node_params(tr) {
        tr.each(function (d) {
            var td = null;
            if (this.cellIndex == 0) {
                switch (d) {
                    case "name":
                        td = d3.select(this).text("Name");
                        break;
                    case "id":
                        td = d3.select(this).text("ID");
                        break;
                    case "tool_id":
                        td = d3.select(this).text("Tool ID");
                        break;
                    case "tool_version":
                        td = d3.select(this).text("Tool Version");
                        break;
                    case "tool_state":
                        td = d3.select(this).text("Parameters");
                        break;
                    case "annotation":
                        td = d3.select(this).text("Annotation");
                        break;
                }
            } else if (this.cellIndex == 1) {
                if (this.__data__) {
                    switch (this.parentNode.__data__[0]) {
                        case "name":
                        case "id":
                        case "tool_version":
                            td = d3.select(this).text(d);
                            break;
                        case "tool_id":
                            td = d3.select(this).text(d);
                            break;
                        case "tool_state":
                            td = d3.select(this).append("div").attr("class", "nestedTable").call(create_nested_tool_state_table);
                            break;
                        case "annotation":
                            td = d3.select(this).call(create_nested_annotation_table);
                            break;
                    }
                }
            }
        });
    }


// #################################################################
// ########## LAYOUT UPDATE ########################################
// #################################################################

    /*
     * rearange link, node and linklabel positions for each tick in the force layout
     * links can be eighter cubic, quadratic, diagonals (d3 intern) or simple lines
     */
    function update() {
        // custom cubic bezier curve links
        canvas.selectAll(".link").attr("d", function (d) {

            // adapt start and end point to detailed view aswell
            var path = "",
                src_x_mov_exp = d.source.x + shape_dim.node.width / 2 + shape_dim.node_io.offset + shape_dim.node_io.width,
                src_x_exp = d.source.x + shape_dim.node.width + shape_dim.node_io.offset + shape_dim.node_io.width,
                src_y_exp = (shape_dim.node_io.height + 2) * (output_input_con_file_link(d)[0] + 1)
                    - get_outputs_length(d.source.id) * (shape_dim.node_io.height + 2) / 2
                    - shape_dim.node_io.height + shape_dim.node_io.height / 2,
                tar_x_exp = d.target.x - shape_dim.node_io.width - shape_dim.node_io.offset,
                tar_y_exp = (shape_dim.node_io.height + 2) * (output_input_con_file_link(d)[1] + 1)
                    - get_input_conns_length(d.target.id) * (shape_dim.node_io.height + 2) / 2
                    - shape_dim.node_io.height + shape_dim.node_io.height / 2;

            // when the source node is a input node
            if (get_outputs_length(d.source.id) === 0) {
                src_y_exp = (shape_dim.node_io.height + 2) * (output_input_con_file_link(d)[0] + 1)
                    - get_inputs_length(d.source.id) * (shape_dim.node_io.height + 2) / 2
                    - shape_dim.node_io.height + shape_dim.node_io.height / 2;

                tar_y_exp = (shape_dim.node_io.height + 2) * (input_input_con_file_link(d)[1] + 1)
                    - get_input_conns_length(d.target.id) * (shape_dim.node_io.height + 2) / 2
                    - shape_dim.node_io.height + shape_dim.node_io.height / 2;
            }

            // both source and target are collapsed
            if (d.source.expanded_out === false && d.target.expanded_in_con === false) {
                path = "M" + (d.source.x + shape_dim.node.width / 2) + "," + (d.source.y)					// M
                    + " c" + ((d.target.x - d.source.x - shape_dim.node.width) / 2) + "," + "0 "							// C1
                    + ((d.target.x - d.source.x - shape_dim.node.width) / 2) + "," + (d.target.y - d.source.y) + " "	// C2
                    + (d.target.x - d.source.x - shape_dim.node.width) + "," + (d.target.y - d.source.y);		// C3
            }
            // only source is expanded
            else if (d.source.expanded_out === true && d.target.expanded_in_con === false) {
                path = "M" + (src_x_mov_exp) + "," + (d.source.y + src_y_exp)					// M
                    + " c" + ((d.target.x - src_x_exp) / 2) + "," + "0 "										// C1
                    + ((d.target.x - src_x_exp) / 2) + "," + (d.target.y - d.source.y - src_y_exp) + " "	// C2
                    + (d.target.x - src_x_exp) + "," + (d.target.y - d.source.y - src_y_exp);		// C3
            }
            // only target is expanded
            else if (d.source.expanded_out === false && d.target.expanded_in_con === true) {
                path = "M" + (d.source.x + shape_dim.node.width / 2) + "," + (d.source.y)								// M
                    + " c" + ((tar_x_exp - (d.source.x + shape_dim.node.width)) / 2) + "," + "0 "										// C1
                    + ((tar_x_exp - (d.source.x + shape_dim.node.width)) / 2) + "," + (d.target.y - d.source.y + tar_y_exp) + " "	// C2
                    + (tar_x_exp - (d.source.x + shape_dim.node.width)) + "," + (d.target.y - d.source.y + tar_y_exp);		// C3
            }
            // both source and target are expanded
            else {
                path = "M" + (src_x_mov_exp) + "," + (d.source.y + src_y_exp)							// M
                    + " c" + ((tar_x_exp - src_x_exp) / 2) + "," + "0 "												// C1
                    + ((tar_x_exp - src_x_exp) / 2) + "," + (d.target.y - d.source.y - src_y_exp + tar_y_exp) + " "	// C2
                    + (tar_x_exp - src_x_exp) + "," + (d.target.y - d.source.y - src_y_exp + tar_y_exp);		// C3
            }

            return path;
        });

        // node
        canvas.selectAll(".node").attr("transform", function (d) {
            return "translate(" + parseInt(d.x, 10) + "," + parseInt(d.y, 10) + ")";
        });
    }


// #################################################################
// ########## MAIN #################################################
// #################################################################

    /*
     * main callback function which takes care of:
     *		- parsing the json file
     *		- setting up the d3 scale
     *		- defining the force layout
     *		- printing workflow name and annotation
     *		- providing drag support
     * 		- extracting links and nodes from the json file
     *		- appends the actual link and node shapes
     *
     * data: raw datastructure from json file
     * canvas: visualization svg canvas
     */
    function visualize_workflow(data, canvas) {
        // extracted workflow dataset
        dataset = {steps: d3.values(data.steps), links: [], nodes: [], name: "", annotation: {}, graph_depth: 0, graph_width: 0, columns: []};

        // x scale
        var xscale = d3.scale.linear()
                .domain([0, shape_dim.window.width])
                .range([0, shape_dim.window.width]),
        // y scale
            yscale = d3.scale.linear()
                .domain([0, shape_dim.window.height])
                .range([0, shape_dim.window.height]);

        // zoom behavior (only with ctrl key down)
        zoom = d3.behavior.zoom();
        d3.select("#vis_workflow").select("svg").call(zoom.on("zoom", geometric_zoom))
            .on("dblclick.zoom", null)
            .on("mousewheel.zoom", null)
            .on("DOMMouseScroll.zoom", null)
            .on("wheel.zoom", null);

        // zoom is allowed with ctrl-key down only
        d3.select("body").on("keydown", function () {
            if (d3.event.ctrlKey)
                d3.select("#vis_workflow").select("svg").call(zoom.on("zoom", geometric_zoom));
        });

        // on zoomend, disable zoom behavior again
        zoom.on("zoomend", function () {
            d3.select("#vis_workflow").select("svg").call(zoom.on("zoom", geometric_zoom))
                .on("dblclick.zoom", null)
                .on("mousewheel.zoom", null)
                .on("DOMMouseScroll.zoom", null)
                .on("wheel.zoom", null);
        });

        // overlay rect for zoom
        canvas.append("g").append("rect")
            .attr("class", "overlay")
            .attr("x", -shape_dim.window.width)
            .attr("y", -shape_dim.window.height)
            .attr("width", shape_dim.window.width * 4)
            .attr("height", shape_dim.window.height * 4)
            .attr("fill", "none")
            .attr("pointer-events", "all");

        // force layout definition
        force = d3.layout.force()
            .size(layout_prop.size)
            .linkDistance(layout_prop.link_distance)
            .linkStrength(layout_prop.link_strength)
            .friction(layout_prop.friction)
            .charge(layout_prop.charge)
            .theta(layout_prop.theta)
            .gravity(layout_prop.gravity)
            .on("tick", update);

        // drag and drop node enabled
        var drag = force.drag()
            .on("dragstart", dragstart)
            .on("dragend", dragend);

        // extract links via input connections
        dataset.steps.forEach(
            function (y) {
                if (y.input_connections != null) {
                    d3.values(y.input_connections).forEach(function (x) {
                        dataset.links.push({source: +x.id, target: +y.id, id: ("link_" + x.id + "_" + y.id), highlighted: false});
                    });
                }
            }
        );

        // extract nodes from steps
        dataset.steps.forEach(function (d) {
            if (d3.values(d.input_connections).length == 0) {
                dataset.nodes.push({id: d.id, fixed: true, type: "input"});
            }
            else if (!src_elem_in_arr(dataset.links, d.id)) {
                dataset.nodes.push({id: d.id, fixed: true, type: "output"});
            }
            else {
                dataset.nodes.push({id: d.id, fixed: true});
            }
            dataset.nodes[d.id].highlighted = false;
            dataset.nodes[d.id].expanded_out = false;
            dataset.nodes[d.id].expanded_in_con = false;
            dataset.nodes[d.id].visited = false;
        });

        // add graph metrics
        in_nodes = get_input_nodes();
        out_nodes = get_output_nodes();

        // set columns for nodes
        in_nodes.forEach(function (d) {
            d.column = 0;
            d.visited = true;
        });

        in_nodes.forEach(function (d) {
            calc_columns(d);
        });

        set_graph_width();
        set_graph_depth();

        // add column expansion logic
        for (var k = 0; k < dataset.graph_depth; k++) {
            dataset.columns.push({inputs: 0, outputs: 0});	//number of inputs and outputs of nodes expanded initially set to 0
        }

        // save subgraph for each node
        dataset.nodes.forEach(function (d, i) {
            var sel_node_id = d.id,
                subgraph = [],
                graph_index = -1;

            get_subgraph_by_id(sel_node_id, subgraph, graph_index, sel_node_id, 0);

            if (subgraph.length === 0) {
                dataset.nodes[i].subgraph = [];
            } else {
                dataset.nodes[i].subgraph = subgraph;
            }
        });


        // -----------------------------------------------------------------
        // ------------------- GALAXY LAYOUT COORDINATES -------------------
        // -----------------------------------------------------------------
        if (layout === layout_kind.GALAXY) {
            dataset.steps.forEach(function (d) {
                if (d.position != null) {
                    dataset.nodes[d.id].x = xscale(d.position.left);
                    dataset.nodes[d.id].y = yscale(d.position.top);
                }
            });
        }


        // -----------------------------------------------------------------
        // ------------------- REFINERY LAYOUT COORDINATES -------------------
        // -----------------------------------------------------------------
        else if (layout === layout_kind.REFINERY) {

            // init rows for inputs first
            in_nodes.forEach(function (d, i) {
                d.row = i;
            });

            // set all nodes to unvisited
            dataset.nodes.forEach(function (d) {
                d.visited = false;
            });

            // process layout
            for (var i_depth = 0; i_depth < dataset.graph_depth; i_depth++) {

                // for each column
                get_nodes_by_col(i_depth).forEach(function (cur) {
                    // get successors for column nodes
                    var succ_nodes = get_succ_nodes_by_node_id(cur.id);

                    // branch -> new rows to add before and after
                    if (succ_nodes.length > 1) {

                        // successors already visited
                        var visited = get_number_of_visited_nodes_by_arr(succ_nodes),
                            row_shift = parseInt(succ_nodes.length / 2, 10);

                        // shift nodes before and after
                        // only if there are more than one successor
                        if (succ_nodes.length - visited > 1) {
                            shift_nodes_by_rows(row_shift, cur.column, cur.row);
                            shift_nodes_by_rows(row_shift, cur.column, cur.row + 1);
                        }

                        var succ_row = cur.row - row_shift + visited;
                        succ_nodes.forEach(function (succ) {
                            if (succ_nodes.length % 2 === 0 && succ_row === cur.row) {
                                succ_row++;
                            }

                            if (dataset.nodes[succ].visited === false) {
                                dataset.nodes[succ].row = succ_row;
                                dataset.nodes[succ].visited = true;
                                succ_row++;
                            }
                        });
                    } else {
                        succ_nodes.forEach(function (succ) {
                            dataset.nodes[succ].row = dataset.nodes[cur.id].row;
                        });
                    }
                });
            }

            var max_row = 0;
            dataset.nodes.forEach(function (d) {
                if (d.row > max_row) {
                    max_row = d.row;
                }
            });
            dataset.graph_rows = max_row + 1;

            // set coordinates for nodes
            for (var i = 0; i < dataset.graph_depth; i++) {
                get_nodes_by_col(i).forEach(function (cur) {
                    cur.x = xscale(shape_dim.margin.left + cur.column * shape_dim.column.width);
                    cur.y = yscale(shape_dim.margin.top + cur.row * shape_dim.row.height);
                });
            }
        } else {
            console.log("ERROR: No layout chosen!")
        }

        // -----------------------------------------------------------------
        // ------------------- SVG ELEMENTS --------------------------------
        // -----------------------------------------------------------------

        // force layout links and nodes
        var link = canvas.selectAll(".link"),
            node = canvas.selectAll(".node");

        // link represented as line
        link = link
            .data(dataset.links)
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("id", function (d) {
                return "link_" + d.source + "_" + d.target;
            })
            .attr("stroke", "gray")
            .attr("stroke-width", 1.5);

        // node represented as a group
        node = node
            .data(dataset.nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("id", function (d) {
                return "node_" + d.id;
            })
            .call(drag);

        var node_g = node.append("g")
            .attr("class", "nodeG");

        // node shape
        node_g.append("rect")
            .attr("class", "nodeRect")
            .attr("width", shape_dim.node.width)
            .attr("height", shape_dim.node.height)
            .attr("x", -shape_dim.node.width / 2)
            .attr("y", -shape_dim.node.height / 2)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("fill", "lightsteelblue")
            .attr("stroke", "gray")
            .attr("stroke-width", 1.5);

        // node title
        node_g.append("g")
            .attr("transform", function () {
                return "translate(" + 0 + "," + parseInt(-shape_dim.node.height / 2, 10) + ")";
            })
            .attr("class", "nodeTitle")
            .call(node_title);

        // create tooltip
        // create d3-tip tooltips
        node_g.each(function () {
            var tip = d3.tip()
                .attr("class", "d3-tip")
                .offset([-10, 0])
                .html(function (d) {
                    return "<span style='color:#fa9b30'>" + dataset.steps[d.id].name + "</span>";
                });

            // invoke tooltip on dom element
            d3.select(this).call(tip);
            d3.select(this).on("mouseover", tip.show)
                .on("mouseout", tip.hide);
        });

        // node inputs
        var node_input = node.append("g").attr("transform", function () {
            return "translate(" + parseInt((shape_dim.node.width / 2), 10) + "," + 0 + ")";
        })
            .attr("class", "nodeInput");

        // add groups for title rect pairs
        node_input.selectAll("nodeInputG")
            .data(function (d) {
                return d3.values(dataset.steps[d.id].inputs);
            })
            .enter()
            .append("g")
            .attr("class", "nodeInputG")
            .attr("id", function (d, i) {
                return "nodeInputG_" + i;
            });

        // create input circle
        var node_input_circle = create_node_circle(node_input_circle, node, "nodeInputCircle", "fileIconInputCircle", shape_dim.node.width / 2);

        // node input_con
        var node_input_con = node.append("g").attr("transform", function () {
            return "translate(" + parseInt((-shape_dim.node.width / 2), 10) + "," + 0 + ")";
        })
            .attr("class", "nodeInputCon");

        // add groups for title rect pairs - without the interaction is not possible
        node_input_con.selectAll("nodeInputConG")
            .data(function (d) {
                return d3.values(dataset.steps[d.id].input_connections);
            })
            .enter()
            .append("g")
            .attr("class", "nodeInputConG")
            .attr("id", function (d, i) {
                return "nodeInputConG_" + i;
            });

        // create input con circle
        var node_input_con_circle = create_node_circle(node_input_con_circle, node, "nodeInputConCircle", "fileIconInputConCircle", -shape_dim.node.width / 2);

        // node outputs
        var node_output = node.append("g").attr("transform", function () {
            return "translate(" + parseInt((shape_dim.node.width / 2), 10) + "," + 0 + ")";
        })
            .attr("class", "nodeOutput");

        // add groups for title rect pairs
        node_output.selectAll("nodeOutputG")
            .data(function (d) {
                return d3.values(dataset.steps[d.id].outputs);
            })
            .enter()
            .append("g")
            .attr("class", "nodeOutputG")
            .attr("id", function (d, i) {
                return "nodeOutputG_" + i;
            });

        // create output circle
        var node_output_circle = create_node_circle(node_output_circle, node, "nodeOutputCircle", "fileIconOutputCircle", shape_dim.node.width / 2);

        // dye circles when they contain at least one stored output
        node.each(function (d) {
            dye_circles(d.id);
        });

        // remove unused svg elements (node specific)
        node.each(function (d) {
            // remove input svg group from nodes without inputs
            if (d3.values(dataset.steps[d.id].inputs).length === 0) {
                d3.select(this).select(".nodeInputCircle").remove();
                d3.select(this).select(".nodeInput").remove();
            }
            // remove input_cons icons and selectable node path
            if (d3.values(dataset.steps[d.id].input_connections).length === 0) {
                d3.select(this).select(".nodeInputConCircle").remove();
                d3.select(this).select(".nodePath").remove();
            }
            // remove output icons
            if (d3.values(dataset.steps[d.id].outputs).length === 0) {
                d3.select(this).select(".nodeOutputCircle").remove();
            }
            // change node rect for input nodes
            if (d3.values(dataset.steps[d.id].input_connections).length === 0) {
                d3.select(this).select(".nodeRect").attr("fill", "white");
            }
        });

        // -----------------------------------------------------------------
        // ------------------- FORCE LAYOUT START --------------------------
        // -----------------------------------------------------------------

        // execute force layout
        // attention: after executing the force layout,
        // link.source and link.target obtain the node data structures instead of simple integer ids
        force
            .nodes(dataset.nodes)
            .links(dataset.links)
            .start();

        // initial fit to window call
        fit_wf_to_window(0);

        // -----------------------------------------------------------------
        // ------------------- EVENTS --------------------------------------
        // -----------------------------------------------------------------

        // -----------------------------------------------------------------
        // ------------------- CLEAR HIGHLIGHTING AND REMOVE TABLE ---------
        // -----------------------------------------------------------------
        var overlay_on_click = function () {
            // remove old table on click
            d3.select("#workflowtbl").remove();
            clear_highlighting(link);
        };

        // -----------------------------------------------------------------
        // ------------------- FIT WORKFLOW TO WINDOW ----------------------
        // -----------------------------------------------------------------
        var overlay_on_dblclick = function () {
            fit_wf_to_window(1000);
        };

        // -----------------------------------------------------------------
        // ------------------- CLICK DBLCLICK SEPARATION -------------------
        // -----------------------------------------------------------------
        var firing = false,
            timer,
            overlay_action = overlay_on_click;	// default action

        d3.select(".overlay").on("click", function () {
            // suppress after dragend
            if (d3.event.defaultPrevented) return;

            // if dblclick, break
            if (firing) {
                return;
            }

            firing = true;
            // function overlay_action is called after a certain amount of time
            timer = setTimeout(function () {
                overlay_action();	// called always

                overlay_action = overlay_on_click; // set back click action to single
                firing = false;
            }, 150); // timeout value
        });

        // if dblclick, the single click action is overwritten
        d3.select(".overlay").on("dblclick", function () {
            overlay_action = overlay_on_dblclick;
        });

        // -----------------------------------------------------------------
        // ------------------- TABLE AND PATH HIGHLIGHTING -----------------
        // -----------------------------------------------------------------
        // update table data with properties of selected node
        node.select(".nodeG").on("click", function (x) {

            // suppress after dragend
            if (d3.event.defaultPrevented) return;

            // -----------------------------------------------------------------
            // ------------------- PATH HIGHLIGHTING ---------------------------
            // -----------------------------------------------------------------
            // get selected node
            var sel_path = [],
                sel_node_rect = d3.select(this).select(".nodeRect"),
                sel_path_rect = d3.select(this.parentNode).selectAll(".inputConRect");

            x.subgraph.forEach(function (d, i) {
                sel_path = sel_path.concat.apply(sel_path, x.subgraph[i]);
            });

            // clear previous highlighting
            overlay_on_click();

            if (typeof sel_path[0] !== "undefined") {
                // when path beginning with this node is not highlighted yet
                if (sel_path[0].highlighted === false) {
                    dye_path(sel_path, sel_node_rect, sel_path_rect, "orange", 5, "orange", true);
                } else {
                    dye_path(sel_path, sel_node_rect, sel_path_rect, "gray", 1.5, "lightsteelblue", false);
                }
            }

            // -----------------------------------------------------------------
            // ------------------- TABLE ---------------------------------------
            // -----------------------------------------------------------------
            create_table(x);
        });


        // -----------------------------------------------------------------
        // ------------------- INPUT CON FILES -----------------------------
        // -----------------------------------------------------------------
        node_input_con_circle.on("mouseover", function () {
            d3.select(this).select(".fileIconInputConCircle")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2);
        });

        node_input_con_circle.on("mouseout", function () {
            d3.select(this).select(".fileIconInputConCircle")
                .attr("stroke", "gray")
                .attr("stroke-width", 1.5);
        });

        node_input_con_circle.on("click", node_input_con_circle_event);

        // -----------------------------------------------------------------
        // ------------------- INPUT CON FILES REMOVE EVENT ----------------
        // -----------------------------------------------------------------
        d3.selectAll(".nodeInputCon").on("click", function (x) {
            x.expanded_in_con = false;
            dataset.columns[x.column].inputs -= 1;

            if (dataset.columns[x.column].inputs === 0 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.COLLAPSE_LEFT);
            }

            // show input con circle again
            var cur_node_id = this.parentNode.__data__.id,
                node_circle = d3.select("#node_" + cur_node_id).select(".nodeInputConCircle");

            node_circle.attr("opacity", 1);

            // remove expanded files
            removeGlobalTooltip("#tt_id-" + cur_node_id);
            d3.select(this.parentNode).selectAll(".inputConRect").remove();
            d3.select(this.parentNode).selectAll(".inputConRectTitle").remove();
            d3.select(this.parentNode).selectAll(".inputConRectCircle").remove();
            d3.select(this.parentNode).selectAll(".inputConRectCircleG").remove();

            force.resume();
            update();
        });

        // -----------------------------------------------------------------
        // ------------------- OUTPUT FILES --------------------------------
        // -----------------------------------------------------------------
        node_output_circle.on("mouseover", function () {
            d3.select(this).select(".fileIconOutputCircle")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2);
        });

        node_output_circle.on("mouseout", function () {
            d3.select(this).select(".fileIconOutputCircle")
                .attr("stroke", "gray")
                .attr("stroke-width", 1.5);
        });

        node_output_circle.on("click", node_output_circle_event);

        // -----------------------------------------------------------------
        // ------------------- OUTPUT FILES REMOVE EVENT -------------------
        // -----------------------------------------------------------------
        d3.selectAll(".nodeOutput").on("click", function (x) {
            x.expanded_out = false;
            dataset.columns[x.column].outputs -= 1;

            if (dataset.columns[x.column].outputs === 0 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.COLLAPSE_RIGHT);
            }

            // show output circle again
            var cur_node_id = this.parentNode.__data__.id,
                node_circle = d3.select("#node_" + cur_node_id).select(".nodeOutputCircle");
            node_circle.attr("opacity", 1);

            // remove expanded files
            removeGlobalTooltip("#tt_id-" + cur_node_id);
            d3.select(this.parentNode).selectAll(".outputRect").remove();
            d3.select(this.parentNode).selectAll(".outRectTitle").remove();
            d3.select(this.parentNode).selectAll(".outRectCircle").remove();
            d3.select(this.parentNode).selectAll(".outRectCircleG").remove();

            force.resume();
            update();
        });

        // -----------------------------------------------------------------
        // ------------------- INPUT FILES ---------------------------------
        // -----------------------------------------------------------------
        node_input_circle.on("mouseover", function () {
            d3.select(this).select(".fileIconInputCircle")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2);
        });

        node_input_circle.on("mouseout", function () {
            d3.select(this).select(".fileIconInputCircle")
                .attr("stroke", "gray")
                .attr("stroke-width", 1.5);
        });

        node_input_circle.on("click", node_input_circle_event);

        // -----------------------------------------------------------------
        // ------------------- INPUT FILES REMOVE EVENT -------------------
        // -----------------------------------------------------------------
        d3.selectAll(".nodeInput").on("click", function (x) {
            x.expanded_out = false;
            dataset.columns[x.column].outputs -= 1;

            if (dataset.columns[x.column].outputs === 0 && (layout === layout_kind.REFINERY || layout === layout_kind.GALAXY)) {
                update_column_translation(x.column, layout_translation.COLLAPSE_RIGHT);
            }

            // show input circle again
            var cur_node_id = this.parentNode.__data__.id,
                node_circle = d3.select("#node_" + cur_node_id).select(".nodeInputCircle");
            node_circle.attr("opacity", 1);

            // remove expanded files
            removeGlobalTooltip("#tt_id-" + cur_node_id);
            d3.select(this.parentNode).selectAll(".inputRect").remove();
            d3.select(this.parentNode).selectAll(".inputRectTitle").remove();
            d3.select(this.parentNode).selectAll(".inRectCircle").remove();
            d3.select(this.parentNode).selectAll(".inRectCircleG").remove();

            force.resume();
            update();
        });

        // -----------------------------------------------------------------
        // ------------------- WINDOW RESIZE -------------------------------
        // -----------------------------------------------------------------
        d3.select(window).on("resize", resize);
    }

    // publish public function
    return{
        runWorkflowVisualization: function (workflowUrl) {
            runWorkflowVisualizationPrivate(workflowUrl);
        },
        reload_workflow: function (workflowUrl) {
            reload_workflowPrivate(workflowUrl);
        },
        toggle_visibility: function (id) {
            toggle_visibilityPrivate(id);
        }
    };

}();
