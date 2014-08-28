/**
 * Module for render.
 */

var provvisRender = function () {

    var vis = Object.create(null),
        cell = Object.create(null);

    /* Initialize dom elements. */
    var node = Object.create(null),
        link = Object.create(null),
        analysis = Object.create(null),
        aNode = Object.create(null),
        saNode = Object.create(null),

        hLink = Object.create(null);

    var analysisWorkflowMap = d3.map(),

        width = 0,
        depth = 0,
        grid = [],
        cols = d3.map(),
        rows = d3.map();

    var timeScale = Object.create(null);

    /* Simple tooltips by NG. */
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "refinery-tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");

    /**
     * Make tooltip visible and align it to the events position.
     * @param label Inner html code appended to the tooltip.
     * @param event E.g. mouse event.
     */
    var showTooltip = function (label, event) {
        tooltip.html(label);
        tooltip.style("visibility", "visible");
        tooltip.style("top", (event.pageY - 10) + "px");
        tooltip.style("left", (event.pageX + 10) + "px");
    };

    /**
     * Hide tooltip again.
     */
    var hideTooltip = function () {
        tooltip.style("visibility", "hidden");
    };

    /**
     * Drag start listener support for nodes.
     */
    var dragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    /**
     * Update node through translation while dragging or on dragend.
     * @param dom Node dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the node.
     * @param y The current y-coordinate for the node.
     */
    var updateNode = function (dom, n, x, y) {
        /* Drag selected node. */
        dom.attr("transform", "translate(" + x + "," + y + ")");
    };

    /**
     * Update link through translation while dragging or on dragend.
     * @param dom Link dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the links.
     * @param y The current y-coordinate for the links.
     */
    var updateLink = function (dom, n, x, y) {
        /* Drag adjacent links. */

        /**
         * Get x and y coords for BaseNode which is not hidden.
         * @param d Node.
         * @returns {{x: number, y: number}} X and y coordinates of node.
         */
        var getNodeCoords = function (d) {
            var cur = d,
                coords = {x: -1, y: -1};

            while (cur.hidden) {
                cur = cur.parent;
            }
            coords.x = cur.x;
            coords.y = cur.y;
            return coords;
        };

        /* Get input links and update coordinates for x2 and y2. */
        n.predLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
                var srcCoords = getNodeCoords(l.source),
                    pathSegment = "";
                if ($("#prov-ctrl-link-style option:selected").attr("value") === "bezier") {
                    pathSegment = "M" + srcCoords.x + "," + srcCoords.y;
                    pathSegment = pathSegment.concat(" Q" + (srcCoords.x + cell.width / 3) + "," + (srcCoords.y) + " " +
                        (srcCoords.x + cell.width / 2) + "," + (srcCoords.y + (y - srcCoords.y) / 2) + " " +
                        "T" + (srcCoords.x + cell.width) + "," + y) +
                        " H" + x;
                    return pathSegment;
                } else {
                    pathSegment = " M" + srcCoords.x + "," + srcCoords.y;

                    if (Math.abs(srcCoords.x - x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + (srcCoords.x + cell.width) + "," + y + " L" + x + "," + y);
                    } else {
                        pathSegment = pathSegment.concat(" L" + x + "," + y);
                    }
                    return pathSegment;
                }
            });
        });

        /* Get output links and update coordinates for x1 and y1. */
        n.succLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
                var tarCoords = getNodeCoords(l.target),
                    pathSegment = "";
                if ($("#prov-ctrl-link-style option:selected").attr("value") === "bezier") {
                    pathSegment = "M" + x + "," + y;
                    pathSegment = pathSegment.concat(" Q" + (x + cell.width / 3) + "," + (y) + " " +
                        (x + cell.width / 2) + "," + (y + (tarCoords.y - y) / 2) + " " +
                        "T" + (x + cell.width) + "," + tarCoords.y) +
                        " H" + tarCoords.x;
                    return pathSegment;
                } else {
                    pathSegment = " M" + x + "," + y;

                    if (Math.abs(x - tarCoords.x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + (x + cell.width) + "," + tarCoords.y + " L" + tarCoords.x + " " + tarCoords.y);
                    } else {
                        pathSegment = pathSegment.concat(" L" + tarCoords.x + "," + tarCoords.y);
                    }
                    return pathSegment;
                }
            });
        });
    };

    /**
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {

        /* While dragging, hide tooltips. */
        hideTooltip();

        /* Drag selected node. */
        updateNode(d3.select(this), n, d3.event.x, d3.event.y);

        /* Drag adjacent links. */
        updateLink(d3.select(this), n, d3.event.x, d3.event.y);

        /* Update data. */
        n.col = Math.round(-1 * d3.event.x / cell.width);
        n.row = Math.round(d3.event.y / cell.height);
        n.x = -1 * n.col * cell.width;
        n.y = n.row * cell.height;
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function (n) {

        /* Update data. */
        n.col = Math.round(-1 * n.x / cell.width);
        n.row = Math.round(n.y / cell.height);
        n.x = -1 * n.col * cell.width;
        n.y = n.row * cell.height;

        /* Align selected node. */
        updateNode(d3.select(this), n, n.x, n.y);

        /* Align adjacent links. */
        updateLink(d3.select(this), n, n.x, n.y);
    };

    /**
     * Sets the drag events for nodes.
     */
    var applyDragBehavior = function () {
        /* Drag and drop node enabled. */
        var drag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".node, .aNode, .saNode").call(drag);
    };

    /**
     * Dye graph by analyses and its corresponding workflows.
     */
    var dyeWorkflows = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").style("stroke", function (d) {
            return timeScale(parseISOTimeFormat(d.parent.parent.created));
        });
    };

    /**
     * Dye graph by analyses.
     */
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").style("fill", function (d) {
            return timeScale(parseISOTimeFormat(d.parent.parent.created));
        });
    };

    /**
     * Reset css for all links.
     * @param links All links within the graph.
     */
    var clearHighlighting = function (links) {
        d3.selectAll(".hLink").style("display", "none");
        links.forEach(function (l) {
            l.highlighted = false;
        });
    };

    /**
     * Get predecessing nodes for highlighting the path by the current node selection.
     * @param n BaseNode extending constructor function.
     */
    var highlightPredPath = function (n) {
        while (n.hidden) {
            n = n.parent;
        }
        /* Get svg link element, and for each predecessor call recursively. */
        n.predLinks.values().forEach(function (l) {
            l.highlighted = true;
            d3.select("#hLinkId-" + l.autoId).style("display", "inline");
            highlightPredPath(l.source);
        });
    };

    /**
     * Get succeeding nodes for highlighting the path by the current node selection.
     * @param n BaseNode extending constructor function.
     */
    var highlightSuccPath = function (n) {
        while (n.hidden) {
            n = n.parent;
        }
        /* Get svg link element, and for each successor call recursively. */
        n.succLinks.values().forEach(function (l) {
            l.highlighted = true;
            d3.select("#hLinkId-" + l.autoId).style("display", "inline");
            highlightSuccPath(l.target);
        });
    };

    /**
     * Draw links.
     * @param links All links within the graph.
     */
    var drawLinks = function (links) {
        link = vis.canvas.append("g").classed({"links": true}).selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = "";
                if ($("#prov-ctrl-link-style option:selected").attr("value") === "bezier") {
                    pathSegment = "M" + l.source.x + "," + l.source.y;
                    pathSegment = pathSegment.concat(" Q" + (l.source.x + cell.width / 3) + "," + (l.source.y) + " " +
                        (l.source.x + cell.width / 2) + "," + (l.source.y + (l.target.y - l.source.y) / 2) + " " +
                        "T" + (l.source.x + cell.width) + "," + l.target.y) +
                        " H" + l.target.x;
                    return pathSegment;
                } else {
                    pathSegment = " M" + l.source.x + "," + l.source.y;
                    if (Math.abs(l.source.x - l.target.x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + (l.source.x + cell.width) + "," + l.target.y + " H" + l.target.x);
                    } else {
                        pathSegment = pathSegment.concat(" L" + l.target.x + "," + l.target.y);
                    }
                    return pathSegment;
                }
            })
            .classed({
                "link": true
            })
            .style("opacity", 0.0)
            .attr("id", function (l) {
                return "linkId-" + l.autoId;
            }).style("display", function (l) {
                return l.hidden ? "none" : "inline";
            });
    };

    /**
     * Draw subanalysis nodes.
     * @param saNodes Subanalysis nodes.
     */
    var drawSubanalysisNodes = function (saNodes) {
        analysis.each(function (d, i) {
            var analysisId = d3.select(this).attr("id");
            d3.select(this).selectAll(".saNode")
                .data(saNodes.filter(function (san) {
                    return san.parent.autoId === +analysisId.replace(/(analysisId-)/g, "");
                }))
                .enter().append("g").each(function (san) {
                    var g = d3.select(this).classed({"saNode": true})
                        .attr("transform", "translate(" + san.x + "," + san.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + san.autoId;
                        })
                        .style("display", function () {
                            return san.hidden ? "none" : "inline";
                        });

                    /* TODO: TO DISCUSS. */
                    var saMenuData = [
                        {label: "WF", value: 1},
                        {label: "o: " + san.outputs.size(), value: 1},
                        {label: "i: " + san.inputs.size(), value: 1},
                        {label: "SA: " + san.subanalysis, value: 1}
                    ];

                    var arc = d3.svg.arc()
                        .innerRadius(vis.radius)
                        .outerRadius(vis.radius * 4);

                    var pie = d3.layout.pie()
                        .value(function (d) {
                            return d.value;
                        });

                    var arcs = g.append("g").attr("class", "saMenu").data([saMenuData])
                        .selectAll("arc")
                        .data(pie)
                        .enter()
                        .append("g").attr("class", "arc");

                    arcs.append("path")
                        .attr("d", arc).style("opacity", 0.3);

                    arcs.append("text")
                        .attr("class", "saMenuText")
                        .attr("transform", function (d) {
                            return "translate(" + arc.centroid(d)[0] + "," + arc.centroid(d)[1] + ")";
                        })
                        .text(function (d) {
                            return d.data.label;
                        })
                        .style("opacity", 0.5);

                    g.append("g").classed({"saGlyph": true})
                        .style("fill", function () {
                            return timeScale(parseISOTimeFormat(san.parent.created));
                        }).append("polygon")
                        .attr("points", function () {
                            return "0," + (-vis.radius) + " " +
                                (vis.radius) + "," + (-vis.radius / 2) + " " +
                                (vis.radius) + "," + (vis.radius / 2) + " " +
                                "0" + "," + (vis.radius) + " " +
                                (-vis.radius) + "," + (vis.radius / 2) + " " +
                                (-vis.radius) + "," + (-vis.radius / 2);
                        });
                });
        });

        /* Set node dom element. */
        saNode = d3.selectAll(".saNode");
    };

    /**
     * Parses a string into the ISO time format.
     * @param value The time in the string format.
     * @returns {*} The value in the ISO time format.
     */
    var parseISOTimeFormat = function (value) {
        return d3.time.format.iso.parse(value);
    };

    /**
     * Creates a linear time scale ranging from the first to the last analysis created.
     * @param aNodes Analysis nodes.
     * @param range Linear color scale for domain values.
     */
    var createAnalysisTimeScale = function (aNodes, range) {
        var min = d3.min(aNodes.filter(function (d) {
                return d.end !== -1;
            }), function (d) {
                return parseISOTimeFormat(d.created);
            }),
            max = d3.max(aNodes.filter(function (d) {
                return d.end !== -1;
            }), function (d) {
                return parseISOTimeFormat(d.created);
            });

        return d3.time.scale()
            .domain([min, max])
            .range([range[0], range[1]]);
    };

    /**
     * Draw analysis nodes.
     * @param aNodes Analysis nodes.
     */
    var drawAnalysisNodes = function (aNodes) {
        analysis.each(function () {
            var analysisId = d3.select(this).attr("id");
            d3.select(this).selectAll(".aNode")
                .data(aNodes.filter(function (an) {
                    return an.autoId === +analysisId.replace(/(analysisId-)/g, "");
                }))
                .enter().append("g").each(function (an) {
                    d3.select(this).classed({"aNode": true})
                        .attr("transform", "translate(" + an.x + "," + an.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + an.autoId;
                        })
                        .style("display", function () {
                            return an.hidden ? "none" : "inline";
                        })
                        .style("fill", function () {
                            return timeScale(parseISOTimeFormat(an.created));
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-2 * vis.radius) + " " +
                                (2 * vis.radius) + "," + (-vis.radius) + " " +
                                (2 * vis.radius) + "," + (vis.radius) + " " +
                                "0" + "," + (2 * vis.radius) + " " +
                                (-2 * vis.radius) + "," + (vis.radius) + " " +
                                (-2 * vis.radius) + "," + (-vis.radius);
                        });
                });
        });

        /* Set node dom element. */
        aNode = d3.selectAll(".aNode");
    };

    /* TODO: Draw nodes according to analysis creation time. */
    /**
     * Draw nodes.
     * @param nodes All nodes within the graph.
     */
    var drawNodes = function (nodes) {
        analysis.each(function () {
            var analysisId = d3.select(this).attr("id");
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return n.parent.parent.autoId === +analysisId.replace(/(analysisId-)/g, "");
                }))
                .enter().append("g").style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                }).attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .append("circle")
                            .attr("r", vis.radius);
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .append("rect")
                                .attr("transform", "translate(" + ( -vis.radius) + "," + (-vis.radius) + ")")
                                .attr("width", vis.radius * 2)
                                .attr("height", vis.radius * 2);
                        } else if (d.nodeType === "dt") {
                            d3.select(this)
                                .append("rect")
                                .attr("transform", function () {
                                    return "translate(" + (-vis.radius * 0.75) + "," + (-vis.radius * 0.75) + ")" + "rotate(45 " + (vis.radius * 0.75) + "," + (vis.radius * 0.75) + ")";
                                })
                                .attr("width", vis.radius * 1.5)
                                .attr("height", vis.radius * 1.5);
                        }
                    }
                }).attr("class", function (d) {
                    return "node " + d.nodeType + "Node";
                })
                .attr("id", function (d) {
                    return "nodeId-" + d.autoId;
                });
        });

        /* Set node dom element. */
        node = d3.selectAll(".node");
    };

    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     * @param keyStroke Keystroke being pressed at mouse click.
     */
    var handleCollapseExpandNode = function (d, keyStroke) {

        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).style("display", "none");
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Expand. */
        if (keyStroke.ctrl && (d.nodeType === "analysis" || d.nodeType === "subanalysis")) {

            /* Set node visibility. */
            d3.select("#nodeId-" + d.autoId).style("display", "none");
            d.hidden = true;
            d.children.values().forEach(function (cn) {
                d3.select("#nodeId-" + cn.autoId).style("display", "inline");
                if (cn instanceof provvisDecl.Subanalysis === true) {
                    d3.select("#nodeId-" + cn.autoId).select(".saMenu").style("display", "none");
                }
                cn.hidden = false;
            });

            /* Set link visibility. */
            if (d.nodeType === "subanalysis") {
                d.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).style("display", "inline");
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).style("display", "inline");
                    }
                });
            }
            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).style("display", "inline");
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).style("display", "inline");
                    }
                    l.hidden = false;
                });
            });

            /* Update connections. */
            d.children.values().forEach(function (cn) {
                updateNode(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
                updateLink(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
            });

        } else if (keyStroke.shift && d.nodeType !== "analysis") {
            /* Collapse. */

            /* Set node visibility. */
            d.parent.hidden = false;
            d3.select("#nodeId-" + d.parent.autoId).style("display", "inline");
            hideChildNodes(d.parent);

            /* Set link visibility. */
            d.parent.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "none");
                l.hidden = true;
            });
            d.parent.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).style("display", "inline");
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).style("display", "inline");
                    }
                    l.hidden = false;
                });
            });

            /* Update connections. */
            updateNode(d3.select("#nodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
            updateLink(d3.select("#nodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
        }

    };

    /**
     * Path highlighting.
     * @param d Node.
     * @param keyStroke Keystroke being pressed at mouse click.
     * @param links All links within the graph.
     */
    var handlePathHighlighting = function (d, keyStroke, links) {

        /* Clear any highlighting. */
        clearHighlighting(links);

        if (keyStroke.ctrl) {

            /* Highlight path. */
            highlightSuccPath(d);
        } else if (keyStroke.shift) {

            /* Highlight path. */
            highlightPredPath(d);
        }
    };

    /**
     * Fit visualization onto free windows space.
     * @param transitionTime The time in milliseconds for the duration of the animation.
     * @param nodes All nodes within the graph.
     */
    var fitGraphToWindow = function (transitionTime, nodes) {
        var min = [d3.min(nodes, function (d) {
                return d.x - vis.margin.left;
            }), d3.min(nodes, function (d) {
                return d.y - vis.margin.top;
            })],
            max = [d3.max(nodes, function (d) {
                return d.x + vis.margin.right;
            }), d3.max(nodes, function (d) {
                return d.y + vis.margin.bottom;
            })],
            delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(vis.width / delta[0]), (height / delta[1])],
        /* Maximize scale to factor 3. */
            newScale = d3.min(factor.concat([3])),
            newPos = [((vis.width - delta[0] * newScale) / 2),
                ((height - delta[1] * newScale) / 2)];

        newPos[0] -= min[0] * newScale;
        newPos[1] -= min[1] * newScale;

        if (transitionTime !== 0) {
            vis.canvas
                .transition()
                .duration(1000)
                .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        } else {
            vis.canvas.attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        }

        vis.zoom.translate(newPos);
        vis.zoom.scale(newScale);

        /* Background rectangle fix. */
        vis.rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," + (-newPos[1] / newScale) + ")" + " scale(" + (+1 / newScale) + ")");
    };

    /**
     * Wrapper function to invoke scale and transformation onto the visualization.
     * @param nodes All nodes within the graph.
     */
    var handleFitGraphToWindow = function (nodes) {
        fitGraphToWindow(1000, nodes);
    };

    /**
     * Left click on a node to reveal additional details.
     * @param d Node
     * @param d3Event Mouse event.
     */
    var handleNodeSelection = function (d, d3Event) {

        /* Update selection. */
        if (d.selected) {
            d.selected = false;
        } else {
            d.selected = true;
        }

        /* Update node size. */
        if (d.nodeType !== "subanalysis" && d.nodeType !== "analysis") {
            if (d.selected) {
                if (d.nodeType === "raw" || d.nodeType === "processed") {
                    d3.select("#nodeId-" + d.autoId).select("circle").attr("r", vis.radius * 2);
                } else if (d.nodeType === "special") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .attr("transform", "translate(" + (-vis.radius * 2) + "," + (-vis.radius * 2) + ")")
                        .attr("width", vis.radius * 4)
                        .attr("height", vis.radius * 4);
                } else if (d.nodeType === "dt") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .attr("transform", function () {
                            return "translate(" + (-vis.radius * 1.5) + "," + (-vis.radius * 1.5) + ")" +
                                "rotate(45 " + (vis.radius * 1.5) + "," + (vis.radius * 1.5) + ")";
                        })
                        .attr("width", vis.radius * 3)
                        .attr("height", vis.radius * 3);
                }

            } else {
                if (d.nodeType === "raw" || d.nodeType === "processed") {
                    d3.select("#nodeId-" + d.autoId).select("circle").attr("r", vis.radius);
                } else if (d.nodeType === "special") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .attr("transform", "translate(" + (-vis.radius) + "," + (-vis.radius) + ")")
                        .attr("width", vis.radius * 2)
                        .attr("height", vis.radius * 2);
                } else if (d.nodeType === "dt") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .attr("transform", function () {
                            return "translate(" + (-vis.radius * 0.75) + "," + (-vis.radius * 0.75) + ")" +
                                "rotate(45 " + (vis.radius * 0.75) + "," + (vis.radius * 0.75) + ")";
                        })
                        .attr("width", vis.radius * 1.5)
                        .attr("height", vis.radius * 1.5);
                }
            }
        } else if (d.nodeType === "subanalysis") {
            if (d.selected) {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .attr("points", function () {
                        return "0," + (-vis.radius * 2) + " " +
                            (vis.radius * 2) + "," + (-vis.radius) + " " +
                            (vis.radius * 2) + "," + (vis.radius) + " " +
                            "0" + "," + (vis.radius * 2) + " " +
                            (-vis.radius * 2) + "," + (vis.radius) + " " +
                            (-vis.radius * 2) + "," + (-vis.radius);
                    });
            } else {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .attr("points", function () {
                        return "0," + (-vis.radius) + " " +
                            (vis.radius) + "," + (-vis.radius / 2) + " " +
                            (vis.radius) + "," + (vis.radius / 2) + " " +
                            "0" + "," + (vis.radius) + " " +
                            (-vis.radius) + "," + (vis.radius / 2) + " " +
                            (-vis.radius) + "," + (-vis.radius / 2);
                    });
            }

        } else if (d.nodeType === "analysis") {
            if (d.selected) {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .attr("points", function () {
                        return "0," + (-4 * vis.radius) + " " +
                            (4 * vis.radius) + "," + (-vis.radius * 2) + " " +
                            (4 * vis.radius) + "," + (vis.radius * 2) + " " +
                            "0" + "," + (4 * vis.radius) + " " +
                            (-4 * vis.radius) + "," + (vis.radius * 2) + " " +
                            (-4 * vis.radius) + "," + (-vis.radius * 2);
                    });
            } else {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .attr("points", function () {
                        return "0," + (-2 * vis.radius) + " " +
                            (2 * vis.radius) + "," + (-vis.radius) + " " +
                            (2 * vis.radius) + "," + (vis.radius) + " " +
                            "0" + "," + (2 * vis.radius) + " " +
                            (-2 * vis.radius) + "," + (vis.radius) + " " +
                            (-2 * vis.radius) + "," + (-vis.radius);
                    });
            }
        }

        /* TODO: Check for negative cols and rows. */
        var shiftCols = function (col, shiftAmount, selected) {
            for (var i = 0; i < depth; i++) {
                if (i < col) {
                    cols.get(i).x = cols.get(i).x + shiftAmount;
                } else if (i > col) {
                    cols.get(i).x = cols.get(i).x - shiftAmount;
                }

                if (i === col) {
                    d3.select("#vLine-" + i)
                        .attr("x1", cols.get(i).x + shiftAmount * 1.5)
                        .attr("x2", cols.get(i).x + shiftAmount * 1.5);
                } else {
                    d3.select("#vLine-" + i)
                        .attr("x1", cols.get(i).x + shiftAmount / 2)
                        .attr("x2", cols.get(i).x + shiftAmount / 2);
                }
            }
            cols.get(col).expanded = selected ? true : false;
        };
        var shiftRows = function (row, shiftAmount, selected) {
            for (var i = 0; i < width; i++) {

                if (i < row) {
                    rows.get(i).y = rows.get(i).y - shiftAmount;
                } else if (i > row) {
                    rows.get(i).y = rows.get(i).y + shiftAmount;
                }

                if (i === row) {
                    d3.select("#hLine-" + i)
                        .attr("y1", rows.get(i).y + shiftAmount * 1.5)
                        .attr("y2", rows.get(i).y + shiftAmount * 1.5);
                } else {
                    d3.select("#hLine-" + i)
                        .attr("y1", rows.get(i).y + shiftAmount / 2)
                        .attr("y2", rows.get(i).y + shiftAmount / 2);
                }
            }
            rows.get(row).expanded = selected ? true : false;
        };

        if (d.selected) {
            /* Expand row and/or column. */
            if (!cols.get(d.col).expanded) {
                shiftCols(d.col, cell.width, d.selected);
            }
            if (!rows.get(d.row).expanded) {
                shiftRows(d.row, cell.height, d.selected);
            }

            d3.selectAll(".node, .saNode, aNode").each(function (n) {
                if (n.row < d.row || n.row > d.row || n.col > d.col || n.col < d.col) {
                    n.x = cols.get(n.col).x;
                    n.y = rows.get(n.row).y;
                    updateNode(d3.select(this), n, n.x, n.y);
                    updateLink(d3.select(this), n, n.x, n.y);
                }
            });
        } else if (!d.selected) {
            /* Expand row and/or column. */
            if (cols.get(d.col).expanded) {
                shiftCols(d.col, -cell.width, d.selected);
            }
            if (rows.get(d.row).expanded) {
                shiftRows(d.row, -cell.height, d.selected);
            }

            d3.selectAll(".node, .saNode, aNode").each(function (n) {
                if (n.row < d.row || n.row > d.row || n.col > d.col || n.col < d.col) {
                    n.x = cols.get(n.col).x;
                    n.y = rows.get(n.row).y;
                    updateNode(d3.select(this), n, n.x, n.y);
                    updateLink(d3.select(this), n, n.x, n.y);
                }
            });
        }
    };

    /**
     * Adds tooltips to nodes.
     */
    var handleTooltips = function () {

        /**
         * Helper function for tooltip creation.
         * @param key Property name.
         * @param value Property value.
         * @returns {string} Inner html code.
         */
        var createHTMLKeyValuePair = function (key, value) {
            return "<b>" + key + ": " + "</b>" + value;
        };

        /* Node tooltips. */
        node.on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("Node", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Name", d.name) + "<br>" +
                createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
                createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
                createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
                createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
                createHTMLKeyValuePair("Type", d.fileType), event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("Node", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Name", d.name) + "<br>" +
                createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
                createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
                createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
                createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
                createHTMLKeyValuePair("Type", d.fileType), event);
        }).on("mouseout", function () {
            hideTooltip();
        });

        /* Subanalysis tooltips. */
        saNode.select(".saGlyph").on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);

            d3.select(this.parentNode).select(".saMenu").style("display", "inline");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);

            d3.select(this.parentNode).select(".saMenu").style("display", "inline");
        }).on("mouseout", function () {
            hideTooltip();
            /*d3.select(this.parentNode).select(".saMenu").style("display", "none");*/
        });

        /* Analysis tolltips. */
        aNode.on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                createHTMLKeyValuePair("Created", parseISOTimeFormat(d.created)) + "<br>", event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                createHTMLKeyValuePair("Created", parseISOTimeFormat(d.created)) + "<br>", event);
        }).on("mouseout", function () {
            hideTooltip();
        });

        /* Subanalysis arc menu. */
        var curMenu,
            menuTimeout;

        saNode.select(".saMenu").selectAll(".arc").on("mouseover", function () {
            d3.select(this).select("path").style("opacity", 0.7);
            d3.select(this).select(".saMenuText").style("opacity", 1.0);
            clearTimeout(menuTimeout);
        });
        saNode.select(".saMenu").selectAll(".arc").on("mousemove", function () {
            d3.select(this).select("path").style("opacity", 0.7);
            d3.select(this).select(".saMenuText").style("opacity", 1.0);
            clearTimeout(menuTimeout);
        });

        saNode.select(".saMenu").selectAll(".arc").on("mouseout", function () {
            d3.select(this).select("path").style("opacity", 0.3);
            d3.select(this).select(".saMenuText").style("opacity", 0.5);
        });

        saNode.select(".saMenu").on("mouseout", function () {
            clearTimeout(menuTimeout);
            curMenu = d3.select(this);
            menuTimeout = setTimeout(function () {
                curMenu.style("display", "none");
            }, 100);
        });
    };

    /**
     * Draws a grid for the grid-based graph layout.
     *
     * @param grid An array containing cells.
     */
    var drawGrid = function (grid) {
        vis.canvas.append("g").classed({"grid": true}).style("display", "none")
            .selectAll(".vLine")
            .data(function () {
                return grid.map(function (d, i) {
                    return i;
                });
            }).enter().append("line")
            .attr("x1", function (d, i) {
                return cell.width / 2 - parseInt(i % vis.graph.depth, 10) * cell.width;
            }).attr("y1", -cell.height / 2)
            .attr("x2", function (d, i) {
                return cell.width / 2 - parseInt(i % vis.graph.depth, 10) * cell.width;
            }).attr("y2", -cell.height / 2 + (vis.graph.width) * cell.height)
            .classed({"vLine": true})
            .attr("id", function (d) {
                return "vLine-" + d;
            });

        vis.canvas.select(".grid")
            .selectAll(".hLine")
            .data(function () {
                return grid[0].map(function (d, i) {
                    return i;
                });
            }).enter().append("line")
            .attr("x1", cell.width / 2)
            .attr("y1", function (d, i) {
                return -cell.height / 2 + parseInt(i % vis.graph.width, 10) * cell.height;
            })
            .attr("x2", cell.width / 2 - vis.graph.depth * cell.width)
            .attr("y2", function (d, i) {
                return -cell.height / 2 + parseInt(i % vis.graph.width, 10) * cell.height;
            })
            .classed({"hLine": true})
            .attr("id", function (d) {
                return "hLine-" + d;
            });
    };

    /**
     * Draw simple node/link highlighting shapes.
     * @param links All links within the graph.
     */
    var drawHighlightingShapes = function (links) {
        hLink = vis.canvas.append("g").classed({"hLinks": true}).selectAll(".hLink")
            .data(links)
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = "";
                if ($("#prov-ctrl-link-style option:selected").attr("value") === "bezier") {
                    pathSegment = "M" + l.source.x + "," + l.source.y;
                    pathSegment = pathSegment.concat(" Q" + (l.source.x + cell.width / 3) + "," + (l.source.y) + " " +
                        (l.source.x + cell.width / 2) + "," + (l.source.y + (l.target.y - l.source.y) / 2) + " " +
                        "T" + (l.source.x + cell.width) + "," + l.target.y) +
                        " H" + l.target.x;
                    return pathSegment;
                } else {
                    pathSegment = " M" + l.source.x + "," + l.source.y;
                    if (Math.abs(l.source.x - l.target.x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + (l.source.x + cell.width) + "," + l.target.y + " H" + l.target.x);
                    } else {
                        pathSegment = pathSegment.concat(" L" + l.target.x + "," + l.target.y);
                    }
                    return pathSegment;
                }
            })
            .classed({
                "hLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            }).style("stroke", function (d) {
                /*return vis.color(analysisWorkflowMap.get(d.target.analysis));*/
                return timeScale(parseISOTimeFormat(d.target.parent.parent.created));
            });
    };

    /**
     * Expand all analsyes into their subgraph spanned by nodes.
     * @param graph Provenance graph object.
     */
    var expandAll = function (graph) {
        /* Set node visibility. */
        graph.saNodes.forEach(function (san) {
            san.hidden = true;
            d3.selectAll("#nodeId-" + san.autoId).style("display", "none");
        });

        graph.aNodes.forEach(function (an) {
            an.hidden = true;
            d3.selectAll("#nodeId-" + an.autoId).style("display", "none");
        });

        /* Set link visibility. */
        graph.links.forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId).style("display", "inline");
            l.hidden = false;
        });

        /* Set nodes visible first. */
        graph.nodes.forEach(function (d) {
            d.hidden = false;
            d3.select("#nodeId-" + d.autoId).style("display", "inline");
        });

        /* Update connections. */
        graph.nodes.forEach(function (d) {
            updateNode(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
            updateLink(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
        });
    };

    /**
     * Collapse all analyses into single analysis nodes.
     * @param graph Provenance graph object.
     */
    var collapseAll = function (graph) {
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).style("display", "none");
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Hide analyses. */
        graph.aNodes.forEach(function (d) {
            d3.select("#nodeId-" + d.autoId).style("display", "none");
            d.hidden = true;
        });

        graph.saNodes.forEach(function (d) {
            /* Set node visibility. */
            d.hidden = false;
            d3.select("#nodeId-" + d.autoId).style("display", "inline");
            d3.select("#nodeId-" + d.autoId).select(".saMenu").style("display", "none");
            hideChildNodes(d);

            /* Set link visibility. */
            d.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "none");
                l.hidden = true;
            });
            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).style("display", "inline");
                    l.hidden = false;
                });
            });
        });

        /* Update connections. */
        graph.saNodes.forEach(function (d) {
            updateNode(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
            updateLink(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
        });
    };

    /**
     * Handle interaction controls.
     * @param graph Provenance graph object.
     */
    var handleToolbar = function (graph) {

        $("#prov-ctrl-expand-click").click(function () {
            expandAll(graph);
        });

        /* TODO: Preserve path highlighting. */
        $("#prov-ctrl-collapse-click").click(function () {
            collapseAll(graph);
        });

        /* Switch link styles. */
        $("#prov-ctrl-link-style").change(function () {
            d3.selectAll(".node, .aNode, .saNode").each(function (n) {
                if (!n.hidden) {
                    updateLink(d3.select(this), n, n.x, n.y);
                }
            });
        });

        /* Switch time-dependant color scheme. */
        $("#prov-ctrl-color-scheme").change(function () {
            var selectedColorScheme = $("#prov-ctrl-color-scheme option:selected").attr("value");
            switch (selectedColorScheme) {
                case "color":
                    timeScale.range(["lightblue", "darkblue"]);
                    break;
                case "grayscale":
                    timeScale.range(["lightgray", "black"]);
                    break;
            }

            d3.selectAll(".node").style("fill", function (d) {
                return timeScale(parseISOTimeFormat(d.parent.parent.created));
            });
            d3.selectAll(".aNode").style("fill", function (d) {
                return timeScale(parseISOTimeFormat(d.created));
            });
            d3.selectAll(".saNode").select(".saGlyph").style("fill", function (d) {
                return timeScale(parseISOTimeFormat(d.parent.created));
            });
            d3.selectAll(".hLink").style("stroke", function (d) {
                return timeScale(parseISOTimeFormat(d.target.parent.parent.created));
            });
        });

        /* Show and hide grid. */
        $("#prov-ctrl-show-grid").click(function () {
            if ($("#prov-ctrl-show-grid").hasClass("active")) {
                d3.select(".grid").style("display", "none");
            } else {
                d3.select(".grid").style("display", "inline");
            }

        });
    };

    /* TODO: Minimize layout through minimizing analyses - adapt to collapse/expand. */
    /* TODO: Handle analysis aggregation. */
    /**
     * Handle events.
     * @param graph Provenance graph object.
     */
    var handleEvents = function (graph) {

        handleToolbar(graph);

        var keyEvent = Object.create(null),
            nodeClickTimeout;

        d3.selectAll(".node, .saGlyph, .aNode").on("click", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(nodeClickTimeout);

            keyEvent = {"alt": d3.event.altKey, "shift": d3.event.shiftKey, "ctrl": d3.event.ctrlKey};
            nodeClickTimeout = setTimeout(function () {
                if (keyEvent.ctrl || keyEvent.shift) {
                    handlePathHighlighting(d, keyEvent, graph.links);
                } else {
                    handleNodeSelection(d, keyEvent);
                }
            }, 200);
        });

        d3.selectAll(".node, .saGlyph, .aNode").on("dblclick", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(nodeClickTimeout);

            /* Fire double click event. */
            keyEvent = {"alt": d3.event.altKey, "shift": d3.event.shiftKey, "ctrl": d3.event.ctrlKey};
            if (keyEvent.ctrl || keyEvent.shift) {
                handleCollapseExpandNode(d, keyEvent);
            }
        });

        var bRectClickTimeout;
        /* Handle click separation. */
        d3.selectAll(".brect, .link, .hLink, .vLine, .hLine", ".cell").on("click", function () {
            if (d3.event.defaultPrevented) return;
            clearTimeout(bRectClickTimeout);

            /* Click event is executed after 100ms unless the double click event below clears the click event timeout.*/
            bRectClickTimeout = setTimeout(function () {
                clearHighlighting(graph.links);
            }, 200);
        });

        d3.selectAll(".brect, .link, .hLink, .vLine, .hLine, .cell").on("dblclick", function () {
            if (d3.event.defaultPrevented) return;
            clearTimeout(bRectClickTimeout);

            /* Double click event is executed when this event is triggered before the click timeout has finished. */
            handleFitGraphToWindow(graph.nodes);
        });

        /* Handle tooltips. */
        handleTooltips();
    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for analysis only nodes.
     * @param aNodes Analysis nodes.
     */
    var initAnalysisLayout = function (aNodes) {
        var firstLayer = 0;

        aNodes.forEach(function (an) {
            var rootCol;

            if (an.succs.size() > 0) {
                rootCol = an.succs.values()[0].inputs.values()[0].col;

                an.succs.values().forEach(function (san) {
                    san.inputs.values().forEach(function (sanIn) {
                        if (sanIn.col + 1 > rootCol) {
                            rootCol = sanIn.col + 1;
                        }
                    });
                });
            } else {
                if (an.outputs.size() > 0) {
                    rootCol = an.outputs.values()[0].col;
                } else {
                    an.col = firstLayer;
                }
            }

            an.col = rootCol;
            an.x = -an.col * cell.width;
            an.row = an.outputs.values().map(function (aon) {
                return aon.row;
            })[parseInt(an.outputs.size() / 2, 10)];
            an.y = an.row * cell.height;
        });
    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for subanalysis only nodes.
     * @param saNodes Subanalysis nodes.
     */
    var initSubanalysisLayout = function (saNodes) {
        var firstLayer = 0;
        saNodes.forEach(function (san) {
            var rootCol;

            if (san.succs.length > 0) {
                rootCol = san.succs.values()[0].inputs.values()[0].col;

                san.succs.forEach(function (sasn) {
                    sasn.inputs.values().forEach(function (sasnIn) {
                        if (sasnIn.col + 1 > rootCol) {
                            rootCol = sasnIn.col + 1;
                        }
                    });
                });
            } else {
                if (san.outputs.size() > 0) {
                    rootCol = san.outputs.values()[0].col;
                } else {
                    san.col = firstLayer;
                }
            }

            san.col = rootCol;
            san.x = -san.col * cell.width;
            san.row = san.outputs.values().map(function (aon) {
                return aon.row;
            })[parseInt(san.outputs.size() / 2, 10)];
            san.y = san.row * cell.height;
        });
    };

    /**
     * Set coordinates for columns and rows as well as nodes.
     * @param nodes All nodes within the graph.
     * @param width Graph width in rows.
     * @param depth Graph depth in cols.
     */
    var assignCellCoords = function (nodes, width, depth) {
        for (var i = 0; i < depth; i++) {
            cols.set(i, {"x": -i * cell.width, "expanded": false});
        }
        for (i = 0; i < width; i++) {
            rows.set(i, {"y": i * cell.height, "expanded": false});
        }

        nodes.forEach(function (n) {
            n.x = cols.get(n.col).x;
            n.y = rows.get(n.row).y;
        });
    };

    /**
     * Creates analysis group dom elements which then contain the nodes of an analysis.
     * @param aNodes Analysis nodes.
     */
    var createAnalysisLayers = function (aNodes) {
        /* Add analyses dom groups. */
        aNodes.forEach(function (an) {
            vis.canvas.append("g")
                .classed("analysis", true)
                .attr("id", function () {
                    return "analysisId-" + an.autoId;
                });
        });
        analysis = d3.selectAll(".analysis");
    };

    /**
     * Main render module function.
     * @param provVis The provenance visualization root object.
     */
    var runRenderPrivate = function (provVis) {
        /* Save vis object to module scope. */
        vis = provVis;
        cell = {width: vis.radius * 3, height: vis.radius * 3};

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.width;
        depth = vis.graph.depth;
        grid = vis.graph.grid;

        /* Short delay. */
        setTimeout(function () {
            timeScale = createAnalysisTimeScale(vis.graph.aNodes, ["lightgray", "black"]);

            /* Set coordinates for nodes. */
            assignCellCoords(vis.graph.nodes, vis.graph.width, vis.graph.depth);

            /* Draw grid. */
            drawGrid(vis.graph.grid);

            /* Draw simple background links for highlighting. */
            drawHighlightingShapes(vis.graph.links);

            /* Draw links. */
            drawLinks(vis.graph.links);

            /* Create analysis group layers. */
            createAnalysisLayers(vis.graph.aNodes);

            /* Draw nodes. */
            drawNodes(vis.graph.nodes);

            /* Create initial layout for subanalysis only nodes. */
            initSubanalysisLayout(vis.graph.saNodes);
            /* Draw subanalysis nodes. */
            drawSubanalysisNodes(vis.graph.saNodes);

            /* Create initial layout for analysis only nodes. */
            initAnalysisLayout(vis.graph.aNodes);
            /* Draw analysis nodes. */
            drawAnalysisNodes(vis.graph.aNodes);

            /* Set initial graph position. */
            fitGraphToWindow(0, vis.graph.nodes);

            /* Color-encoded time. */
            dyeAnalyses();

            /* Add dragging behavior to nodes. */
            applyDragBehavior();

            /* Initially collapse all analyses. */
            collapseAll(vis.graph);

            /* Event listeners. */
            $(function () {
                handleEvents(vis.graph);
            });

            /* Fade in. */
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

    /* TODO: PROTOTYPE: Quick implementation. */
    /**
     * On attribute filter change, the provenance visualization will be updated.
     * @param vis The provenance visualization root object.
     * @param solrResponse Query response object holding information about attribute filter changed.
     */
    var runRenderUpdatePrivate = function (vis, solrResponse) {

        vis.graph.nodes.forEach(function (n) {
            n.hidden = true;
            d3.select("#nodeId-" + n.autoId).style("display", "none");
        });
        vis.graph.links.forEach(function (l) {
            l.hidden = true;
            d3.select("#linkId-" + l.autoId).style("display", "none");
        });

        solrResponse.getDocumentList().forEach(function (d) {
            var selNode = vis.graph.nodeMap.get(d.uuid);
            selNode.parent.children.values().forEach(function (cn) {
                cn.hidden = false;
                d3.select("#nodeId-" + cn.autoId).style("display", "inline");
            });
            selNode.parent.links.values().forEach(function (cl) {
                cl.hidden = false;
                d3.select("#linkId-" + cl.autoId).style("display", "inline");
            });
        });
    };

    /**
     * Publish module function.
     */
    return{
        runRender: function (vis) {
            runRenderPrivate(vis);
        }, runRenderUpdate: function (vis, solrResponse) {
            runRenderUpdatePrivate(vis, solrResponse);
        }
    };
}();