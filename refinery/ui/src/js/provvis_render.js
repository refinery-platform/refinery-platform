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

        gridCell = Object.create(null),
        hLink = Object.create(null),
        hNode = Object.create(null);

    var nodes = [],
        links = [],

        analysisWorkflowMap = d3.map(),

        width = 0,
        depth = 0,
        grid = [];

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
        dom.attr("transform", function (d) {
            switch (d.nodeType) {
                case "dummy":
                case "raw":
                case "analysis":
                case "subanalysis":
                case "processed":
                    return "translate(" + x + "," + y + ")";
                case "special":
                    return "translate(" + (x - vis.radius) + "," + (y - vis.radius) + ")";
                case "dt":
                    return "translate(" + (x - vis.radius * 0.75) + "," + (y - vis.radius * 0.75) + ")";
            }
        });
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
                    pathSegment = " M" + srcCoords.x + "," + srcCoords.y;

                if (Math.abs(srcCoords.x - x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(srcCoords.x + (cell.width)) + "," + parseInt(y, 10) + " L" + parseInt(x, 10) + "," + parseInt(y, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(x, 10) + "," + parseInt(y, 10));
                }
                return pathSegment;
            });
        });

        /* Get output links and update coordinates for x1 and y1. */
        n.succLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
                var tarCoords = getNodeCoords(l.target),
                    pathSegment = " M" + parseInt(x, 10) + "," + parseInt(y, 10);

                if (Math.abs(x - tarCoords.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(x + cell.width, 10) + "," + tarCoords.y + " L" + tarCoords.x + " " + tarCoords.y);
                } else {
                    pathSegment = pathSegment.concat(" L" + tarCoords.x + "," + tarCoords.y);
                }
                return pathSegment;
            });
        });
    };

    /**
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {

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
            return vis.color(analysisWorkflowMap.get(d.analysis));
        });
    };

    /**
     * Dye graph by analyses.
     */
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").style("fill", function (d) {
            return vis.color(d.analysis);
        });
    };

    /**
     * Reset css for all nodes.
     */
    var clearHighlighting = function () {
        d3.selectAll(".hNode, .hLink").style("display", "none");
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
            d3.select("#hLinkId-" + l.autoId).style("display", "inline");
            highlightSuccPath(l.target);
        });
    };


    /* TODO: Add bezier links. (See workflow visualization) */
    /* TODO: Let user switch between original and bezier links. */
    /**
     * Draw links.
     */
    var drawLinks = function () {
        link = vis.canvas.append("g").classed({"links": true}).selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(l.source.x, 10) + "," + parseInt(l.source.y, 10);
                if (Math.abs(l.source.x - l.target.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.source.x + (cell.width)) + "," + parseInt(l.target.y, 10) + " H" + parseInt(l.target.x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.target.x, 10) + "," + parseInt(l.target.y, 10));
                }
                return pathSegment;
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

        /* TODO: FIX: in certain cases, tooltips collide with canvas bounding box */
        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (l) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + l.autoId + "</span><br>" +
                    "<strong>Source Id:</strong> <span style='color:#fa9b30'>" + l.source.autoId + "</span><br>" +
                    "<strong>Target Id:</strong> <span style='color:#fa9b30'>" + l.target.autoId + "</span>";
            });

        /* Invoke tooltip on dom element. */
        link.call(tip);
        link.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
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
                    d3.select(this).classed({"saNode": true})
                        .attr("transform", "translate(" + san.x + "," + san.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + san.autoId;
                        })
                        .style("display", function () {
                            return san.hidden ? "none" : "inline";
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-vis.radius) + " " +
                                (vis.radius) + "," + (-vis.radius / 2) + " " +
                                (vis.radius) + "," + (vis.radius / 2) + " " +
                                "0" + "," + (vis.radius) + " " +
                                (-vis.radius) + "," + (vis.radius / 2) + " " +
                                (-vis.radius) + "," + (-vis.radius / 2);
                        })
                        .style("fill", function () {
                            return vis.color(san.parent.uuid);
                        })
                        .style("stroke", function () {
                            return vis.color(analysisWorkflowMap.get(san.parent.uuid));
                        })
                        .style("stroke-width", 2);
                });
        });

        /* Set node dom element. */
        saNode = d3.selectAll(".saNode");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.autoId + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span>";
            });

        /* Invoke tooltip on dom element. */
        saNode.call(tip);
        saNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw analysis nodes.
     * @param aNodes Analysis nodes.
     */
    var drawAnalysisNodes = function (aNodes) {
        analysis.each(function (d, i) {
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
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-2 * vis.radius) + " " +
                                (2 * vis.radius) + "," + (-vis.radius) + " " +
                                (2 * vis.radius) + "," + (vis.radius) + " " +
                                "0" + "," + (2 * vis.radius) + " " +
                                (-2 * vis.radius) + "," + (vis.radius) + " " +
                                (-2 * vis.radius) + "," + (-vis.radius);
                        })
                        .style("fill", function () {
                            return vis.color(an.uuid);
                        })
                        .style("stroke", function () {
                            return vis.color(analysisWorkflowMap.get(an.uuid));
                        })
                        .style("stroke-width", 3);
                });
        });

        /* Set node dom element. */
        aNode = d3.selectAll(".aNode");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return d.autoId === -1 ? "<span style='color:#fa9b30'>Original dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.autoId + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.autoId + "</span><br>" +
                    "<strong>Start:</strong> <span style='color:#fa9b30'>" + d.start + "</span><br>" +
                    "<strong>End:</strong> <span style='color:#fa9b30'>" + d.end + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span>";
            });

        /* Invoke tooltip on dom element. */
        aNode.call(tip);
        aNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw nodes.
     */
    var drawNodes = function () {
        analysis.each(function () {
            var analysisId = d3.select(this).attr("id");
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return n.parent.parent.autoId === +analysisId.replace(/(analysisId-)/g, "");
                }))
                .enter().append("g").style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                }).each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", vis.radius);
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - vis.radius) + "," + (d.y - vis.radius) + ")")
                                .append("rect")
                                .attr("width", vis.radius * 2)
                                .attr("height", vis.radius * 2);
                        } else if (d.nodeType === "dt") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - vis.radius * 0.75) + "," + (d.y - vis.radius * 0.75) + ")")
                                .append("rect")
                                .attr("width", vis.radius * 1.5)
                                .attr("height", vis.radius * 1.5)
                                .attr("transform", function () {
                                    return "rotate(45 " + (vis.radius * 0.75) + "," + (vis.radius * 0.75) + ")";
                                });
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

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.autoId + "</span><br>" +
                    "<strong>Name:</strong> <span style='color:#fa9b30'>" + d.name + "</span><br>" +
                    "<strong>Sub Analysis:</strong> <span style='color:#fa9b30'>" + d.subanalysis + "</span><br>" +
                    "<strong>Sub Analysis Id:</strong> <span style='color:#fa9b30'>" + d.parent.autoId + "</span><br>" +
                    "<strong>Analysis Id:</strong> <span style='color:#fa9b30'>" + d.parent.parent.autoId + "</span><br>" +
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>RowBK left:</strong> <span style='color:#fa9b30'>" + d.rowBK.left + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span><br>" +
                    "<strong>BCOrder:</strong> <span style='color:#fa9b30'>" + d.bcOrder + "</span>";
            });

        /* Invoke tooltip on dom element. */
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     */
    var handleCollapseExpandNode = function () {
        d3.selectAll(".node, .saNode, .aNode").on("dblclick", function (d) {

            var hideChildNodes = function (n) {
                n.children.values().forEach(function (cn) {
                    cn.hidden = true;
                    d3.select("#nodeId-" + cn.autoId).style("display", "none");
                    if (!cn.children.empty())
                        hideChildNodes(cn);
                });
            };

            /* Expand. */
            if (d3.event.ctrlKey && (d.nodeType === "analysis" || d.nodeType === "subanalysis")) {

                /* Set node visibility. */
                d3.select("#nodeId-" + d.autoId).style("display", "none");
                d.hidden = true;
                d.children.values().forEach(function (cn) {
                    d3.select("#nodeId-" + cn.autoId).style("display", "inline");
                    cn.hidden = false;
                });

                /* Set link visibility. */
                if (d.nodeType === "subanalysis") {
                    d.links.values().forEach(function (l) {
                        d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "inline");
                    });
                }
                d.inputs.values().forEach(function (sain) {
                    sain.predLinks.values().forEach(function (l) {
                        d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "inline");
                        l.hidden = false;
                    });
                });

                /* Update connections. */
                d.children.values().forEach(function (cn) {
                    updateNode(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
                    updateLink(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
                });

            } else if (d3.event.shiftKey && d.nodeType !== "analysis") {
                /* Collapse. */

                /* Set node visibility. */
                d.parent.hidden = false;
                d3.select("#nodeId-" + d.parent.autoId).style("display", "inline");
                hideChildNodes(d.parent);

                /* Set link visibility. */
                d.parent.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "none");
                });
                d.parent.inputs.values().forEach(function (sain) {
                    sain.predLinks.values().forEach(function (l) {
                        d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).style("display", "inline");
                        l.hidden = false;
                    });
                });

                /* Update connections. */
                updateNode(d3.select("#nodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
                updateLink(d3.select("#nodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
            }

        });
    };

    /**
     * Path highlighting.
     */
    var handlePathHighlighting = function () {
        d3.selectAll(".node, .aNode, .saNode").on("click", function (x) {

            if (d3.event.ctrlKey || d3.event.shiftKey) {

                /* Suppress after dragend. */
                if (d3.event.defaultPrevented) return;

                /* Clear any highlighting. */
                clearHighlighting();

                if (d3.event.ctrlKey) {

                    /* Highlight path. */
                    highlightSuccPath(x);
                } else if (d3.event.shiftKey) {

                    /* Highlight path. */
                    highlightPredPath(x);
                }
            }
        });
    };

    /**
     * Fit visualization onto free windows space.
     * @param transitionTime The time in milliseconds for the duration of the animation.
     */
    var fitGraphToWindow = function (transitionTime) {
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
     */
    var handleFitGraphToWindow = function () {
        fitGraphToWindow(1000);
    };

    /* TODO: BUG: On double click, single-click action still is executed. */
    /**
     * Click and double click separation on background rectangle.
     */
    var handleBRectClick = function () {
        var clickInProgress = false, /* click in progress. */
            timer = 0,
            bRectAction = clearHighlighting;
        /* default action. */
        d3.selectAll(".brect, .cell").on("click", function () {

            /* Suppress after drag end. */
            if (d3.event.defaultPrevented) return;

            /* If double click, break. */
            if (clickInProgress) {
                return;
            }
            clickInProgress = true;

            /* Single click event is called after timeout unless a dblclick action is performed. */
            timer = setTimeout(function () {
                bRectAction();

                /* Called every time. */
                bRectAction = clearHighlighting;

                /* Set back click action to single. */
                clickInProgress = false;
            }, 200);
            /* Timeout value. */
        });

        /* if double click, the single click action is overwritten. */
        d3.selectAll(".brect, .cell").on("dblclick", function () {
            bRectAction = handleFitGraphToWindow;
        });
    };

    /**
     * Draws a grid for the grid-based graph layout.
     *
     * @param grid An array containing cells.
     */
    var drawGrid = function (grid) {
        gridCell = vis.canvas.append("g").classed({"cells": true}).selectAll(".cell")
            .data(function () {
                return [].concat.apply([], grid);
            })
            .enter().append("rect")
            .attr("x", function (d, i) {
                return -cell.width / 2 - parseInt(i / vis.graph.width, 10) * cell.width;
            })
            .attr("y", function (d, i) {
                return -cell.height / 2 + (i % vis.graph.width) * cell.height;
            })
            .attr("width", cell.width)
            .attr("height", cell.height)
            .attr("fill", "none")
            .attr("stroke", "lightgray")
            .classed({
                "cell": true
            })
            .style("opacity", 0.7)
            .attr("id", function (d, i) {
                return "cellId-" + parseInt(i / vis.graph.width, 10) + "-" + (i % vis.graph.width);
            });
    };

    /**
     * Draw simple node/link highlighting shapes.
     */
    var drawHighlightingShapes = function () {

        hLink = vis.canvas.append("g").classed({"hLinks": true}).selectAll(".hLink")
            .data(links)
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(l.source.x, 10) + "," + parseInt(l.source.y, 10);
                if (Math.abs(l.source.x - l.target.x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.source.x + (cell.width)) + "," + parseInt(l.target.y, 10) + " H" + parseInt(l.target.x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(l.target.x, 10) + "," + parseInt(l.target.y, 10));
                }
                return pathSegment;
            })
            .classed({
                "hLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            }).style("stroke", function (d) {
                return vis.color(analysisWorkflowMap.get(d.target.analysis));
            });


        hNode = vis.canvas.append("g").classed({"hNodes": true}).selectAll(".hNode")
            .data(nodes)
            .enter().append("g")
            .attr("transform", function (d) {
                return "translate(" + (d.x - cell.width / 2) + "," + (d.y - cell.height / 2) + ")";
            })
            .append("rect")
            .attr("width", cell.width)
            .attr("height", cell.height)
            .classed({"hNode": true})
            .attr("id", function (d) {
                return "hNodeId-" + d.autoId;
            }).style("fill", function (d) {
                return vis.color(analysisWorkflowMap.get(d.analysis));
            });
    };

    /**
     * Handle event listeners.
     */
    var handleEvents = function () {

        /* Path highlighting. */
        handlePathHighlighting();

        /* Handle click separation. */
        handleBRectClick();

        /* TODO: Minimize layout through minimizing analyses - adapt to collapse/expand. */
        /* Handle analysis aggregation. */
        handleCollapseExpandNode();

        /* TODO: On click on node, enlarge shape to display more info. */
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
     * Set coordinates for nodes.
     */
    var assignCellCoords = function () {
        nodes.forEach(function (d) {
            d.x = -d.col * cell.width;
            d.y = d.row * cell.height;
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

        nodes = vis.graph.nodes;
        links = vis.graph.links;

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.width;
        depth = vis.graph.depth;
        grid = vis.graph.grid;

        /* Short delay. */
        setTimeout(function () {

            /* Set coordinates for nodes. */
            assignCellCoords();

            /* Draw grid. */
            drawGrid(vis.graph.grid);

            /* Draw simple node/link highlighting shapes. */
            drawHighlightingShapes();

            /* Draw links. */
            drawLinks();

            /* Create analysis group layers. */
            createAnalysisLayers(vis.graph.aNodes);

            /* Draw nodes. */
            drawNodes();


            /* Create initial layout for subanalysis only nodes. */
            initSubanalysisLayout(vis.graph.saNodes);
            /* Draw subanalysis nodes. */
            drawSubanalysisNodes(vis.graph.saNodes);


            /* Create initial layout for analysis only nodes. */
            initAnalysisLayout(vis.graph.aNodes);
            /* Draw analysis nodes. */
            drawAnalysisNodes(vis.graph.aNodes);


            /* Set initial graph position. */
            fitGraphToWindow(0);

            /* Colorize graph. */
            dyeWorkflows();
            dyeAnalyses();

            /* Add dragging behavior to nodes. */
            applyDragBehavior();

            /* Event listeners. */
            $(function () {
                handleEvents();
            });

            /* Fade in. */
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

    /**
     * Publish module function.
     */
    return{
        runRender: function (vis) {
            runRenderPrivate(vis);
        }
    };
}();