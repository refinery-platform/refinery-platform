/**
 * Module for render.
 */

var provvisRender = function () {

    var vis = Object.create(null),
        cell = Object.create(null);

    /* Initialize dom elements. */
    var aNode = Object.create(null),
        saNode = Object.create(null),
        node = Object.create(null),
        domNodeset = [],

        link = Object.create(null),
        aLink = Object.create(null),
        saLink = Object.create(null),
        analysis = Object.create(null),
        subanalysis = Object.create(null),
        layer = Object.create(null),

        hLink = Object.create(null),

        saBBox = Object.create(null),
        aBBox = Object.create(null);

    var analysisWorkflowMap = d3.map(),

        width = 0,
        depth = 0;

    var timeColorScale = Object.create(null);
    var filterAction = Object.create(null);

    var lastSolrResponse = Object.create(null);

    var selectedNodeSet = d3.map();

    var draggingActive = false;

    var nodeLinkTransitionTime = 150;

    var aNodesBAK = [],
        saNodesBAK = [],
        nodesBAK = [],
        aLinksBAK = [];

    /* Simple tooltips by NG. */
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "refinery-tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");

    /* TODO: Performance issue - quite slow. */
    /**
     * On doi change, update node doi labels.
     */
    var updateNodeDoi = function () {

        //console.log("#updateNodeDoi");

        /* Update node doi label. */
        domNodeset.select(".nodeDoiLabel").text(function (d) {
            return d.doi.doiWeightedSum;
        });


        /* On analysis doi. */
        aNode.each(function (an) {
            if (an.doi.doiWeightedSum >= (1 / 3) && !an.hidden) {
                /* Expand. */
                handleCollapseExpandNode(an, "e");
            }
        });

        /* On subanalysis doi. */
        saNode.each(function (san) {
            if (san.doi.doiWeightedSum >= (2 / 3) && !san.hidden) {
                /* Expand. */
                handleCollapseExpandNode(san, "e");
            } else if (san.doi.doiWeightedSum < (1 / 3) && !san.parent.hidden) {
                /* Collapse. */
                handleCollapseExpandNode(san, "c");
            } else if (!san.parent.hidden) {
                /* Stay in subanalysis view. */
                handleCollapseExpandNode(san.children.values()[0], "c");
            }
        });
    };

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
     * Hide tooltip.
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
     * Update node coordinates through translation.
     * @param dom Node dom element.
     * @param n Node object element.
     * @param x The current x-coordinate for the node.
     * @param y The current y-coordinate for the node.
     */
    var updateNode = function (dom, n, x, y) {
        /* Set selected node coordinates. */
        dom.transition().duration(draggingActive ? 0 : nodeLinkTransitionTime).attr("transform", "translate(" + x + "," + y + ")");
    };


    /**
     * Path generator for bezier link.
     * @param l Link.
     * @param srcX Source x coordinate.
     * @param srcY Source y coordinate.
     * @param tarX Target x coordinate.
     * @param tarY Target y coordinate.
     * @returns {*} Path for link.
     */
    var drawBezierLink = function (l, srcX, srcY, tarX, tarY) {
        var pathSegment = "M" + srcX + "," + srcY;

        pathSegment = pathSegment.concat(" Q" + (srcX + cell.width / 3) + "," + (srcY) + " " +
        (srcX + cell.width / 2) + "," + (srcY + (tarY - srcY) / 2) + " " +
        "T" + (srcX + cell.width) + "," + tarY) +
        " H" + tarX;

        return pathSegment;
    };

    /**
     * Path generator for straight link.
     * @param l Link.
     * @param srcX Source x coordinate.
     * @param srcY Source y coordinate.
     * @param tarX Target x coordinate.
     * @param tarY Target y coordinate.
     * @returns {*} Path for link.
     */
    var drawStraightLink = function (l, srcX, srcY, tarX, tarY) {
        var pathSegment = " M" + srcX + "," + srcY;

        if (Math.abs(srcX - tarX) > cell.width) {
            pathSegment = pathSegment.concat(" L" + (srcX + cell.width) + "," + tarY + " L" + tarX + "," + tarY);
        } else {
            pathSegment = pathSegment.concat(" L" + tarX + "," + tarY);
        }
        return pathSegment;
    };


    /**
     * Update link through translation while dragging or on dragend.
     * @param n Node object element.
     * @param x The current x-coordinate for the links.
     * @param y The current y-coordinate for the links.
     */
    var updateLink = function (n, x, y) {

        /**
         * Get x and y coords for BaseNode which is not hidden.
         * @param d Node.
         * @returns {{x: number, y: number}} X and y coordinates of node.
         */
        var getFixedNodeCoords = function (d) {
            var cur = d,
                x = (d.nodeType === "analysis") ? cur.x : cur.parent.parent.x + cur.parent.x + cur.x,
                y = (d.nodeType === "analysis") ? cur.y : cur.parent.parent.y + cur.parent.y + cur.y;

            while (cur.hidden) {
                x -= cur.x;
                y -= cur.y;
                cur = cur.parent;
            }

            return {x: x, y: y};
        };

        /**
         * Get x and y coords for BaseNode.
         * @param d Node.
         * @param mX Mouse x.
         * @param mY Mouse y.
         * @returns {{x: *, y: *}}
         */
        var getDraggedNodeCoords = function (d, mX, mY) {
            var deltaX = 0,
                deltaY = 0;

            if (d instanceof provvisDecl.Node && d.parent.parent.hidden) {
                deltaX = d.parent.x;
                deltaY = d.parent.y;
                if (d.parent.hidden) {
                    deltaX += d.x;
                    deltaY += d.y;
                }
            }

            return {x: mX + deltaX, y: mY + deltaY};
        };

        /* Get input links and update coordinates for x2 and y2. */
        n.predLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId)
                .transition()
                .duration(draggingActive ? 0 : nodeLinkTransitionTime)
                .attr("d", function (l) {

                    var srcCoords = getFixedNodeCoords(l.source),
                        tarCoords = getDraggedNodeCoords(l.target, x, y);

                    if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    } else {
                        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    }
                });
        });

        /* Get output links and update coordinates for x1 and y1. */
        n.succLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId)
                .transition()
                .duration(draggingActive ? 0 : nodeLinkTransitionTime)
                .attr("d", function (l) {

                    var tarCoords = getFixedNodeCoords(l.target),
                        srcCoords = getDraggedNodeCoords(l.source, x, y);

                    if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    } else {
                        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    }
                });
        });
    };

    /**
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {
        var self = d3.select(this);

        /* While dragging, hide tooltips. */
        hideTooltip();

        /* Set coords. */
        n.x = d3.event.x;
        n.y = d3.event.y;

        /* Drag selected node. */
        updateNode(self, n, d3.event.x, d3.event.y);

        /* Drag adjacent links. */
        updateLink(n, d3.event.x, d3.event.y);

        draggingActive = true;
    };

    /**
     * Drag analysis node.
     * @param n Analysis node.
     * @param dom Analysis node as dom object.
     */
    var dragAnalysisNode = function (n, dom) {

        //console.log(" #dragAnalysisNode " + n.autoId);

        var self = dom;

        /* Align selected node. */
        updateNode(self, n, n.x, n.y);

        /* Align adjacent links. */
        updateLink(n, n.x, n.y);
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function (n) {
        if (draggingActive) {
            var self = d3.select(this);

            /* Shift analysis node. */
            dragAnalysisNode(n, self);

            /* Prevent other mouseevents during dragging. */
            setTimeout(function () {
                draggingActive = false;
            }, 200);
        }
    };

    /**
     * Sets the drag events for nodes.
     */
    var applyDragBehavior = function () {
        /* Drag and drop node enabled. */
        var drag = d3.behavior.drag()
            .origin(function (d) {
                return d;
            })
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        analysis.call(drag);
    };

    /* TODO: Update to incorporate facet filtering and adjust link visibility on loose graphs. */
    /**
     * Filter analyses by time gradient support view.
     * @param timeThreshold The point of time where analyses executed before are hidden.
     * @param vis The provenance visualization root object.
     */
    var filterAnalysesByTime = function (timeThreshold, vis) {
        vis.graph.aNodes = aNodesBAK;
        vis.graph.saNodes = saNodesBAK;
        vis.graph.nodes = nodesBAK;
        vis.graph.aLinks = aLinksBAK;

        var selAnalyses = vis.graph.aNodes.filter(function (an) {
            return parseISOTimeFormat(an.start) >= timeThreshold;
        });

        /* Set (un)filtered analyses. */
        vis.graph.aNodes.forEach(function (an) {
            if (selAnalyses.indexOf(an) === -1) {
                an.filtered = false;
                an.children.values().forEach(function (san) {
                    san.filtered = false;
                    san.children.values().forEach(function (n) {
                        n.filtered = false;
                    });
                });
            } else {
                an.filtered = true;
                an.children.values().forEach(function (san) {
                    san.filtered = true;
                    san.children.values().forEach(function (n) {
                        n.filtered = true;
                    });
                });
            }
        });

        /* Update analysis link filter attributes. */
        vis.graph.aLinks.forEach(function (al) {
            al.filtered = false;
        });
        vis.graph.aLinks.filter(function (al) {
            return al.source.parent.parent.filtered && al.target.parent.parent.filtered;
        }).forEach(function (al) {
            al.filtered = true;
        });

        /* On filter action 'hide', splice and recompute graph. */
        if (filterAction === "hide") {

            /* Update filtered nodesets. */
            vis.graph.aNodes = vis.graph.aNodes.filter(function (an) {
                return an.filtered;
            });
            vis.graph.saNodes = vis.graph.saNodes.filter(function (san) {
                return san.filtered;
            });
            vis.graph.nodes = vis.graph.nodes.filter(function (n) {
                return n.filtered;
            });

            /* Update filtered linksets. */
            vis.graph.aLinks = vis.graph.aLinks.filter(function (al) {
                return al.filtered;
            });
        }

        updateNodeDoi();

        dagreDynamicLayout(vis.graph);
        fitGraphToWindow(nodeLinkTransitionTime);

        updateNodeFilter();
        updateAnalysisLinks(vis.graph);

        vis.graph.aNodes.forEach(function (an) {
            updateLink(an, an.x, an.y);
        });
    };

    /**
     * Draws the support view.
     * @param vis The provenance visualization root object.
     */
    var drawSupportView = function (vis) {
        var svg = d3.select("#provenance-support-view").select("svg");
        var gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradientGrayscale");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#000")
            .attr("stop-opacity", 1);

        svg.append("rect")
            .attr("id", "supportView")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 100)
            .attr("height", 100)
            .style({"fill": "url(#gradientGrayscale)", "stroke": "white", "stroke-width": "1px"});

        svg.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 100)
            .style({"stroke": "#136382", "stroke-width": "2px"});

        var gradientScale = d3.scale.linear()
            .domain([0, 100])
            .range([Date.parse(timeColorScale.domain()[0]), Date.parse(timeColorScale.domain()[1])]);

        aNode.each(function (an) {
            svg.append("line")
                .attr("x1", gradientScale.invert(parseISOTimeFormat(an.start)))
                .attr("y1", 70)
                .attr("x2", gradientScale.invert(parseISOTimeFormat(an.start)))
                .attr("y2", 100)
                .style({"stroke": "#ed7407", "stroke-width": "1.5px"});
        });

        d3.select("#supportView").on("click", function () {
            d3.select(this.parentNode).select("line")
                .attr("x1", d3.mouse(this)[0])
                .attr("x2", d3.mouse(this)[0]);

            var selTimeThreshold = new Date(gradientScale(d3.mouse(this)[0]));

            d3.select("#curTime").html("<b>" + selTimeThreshold + "<b>" + "<br>");

            filterAnalysesByTime(selTimeThreshold, vis);
        });

        $("#prov-support-view-reset-time").click(function () {
            filterAnalysesByTime(Date.parse(timeColorScale.domain()[0]), vis);
            d3.select(this.parentNode).select("line")
                .attr("x1", 0)
                .attr("x2", 0);
            d3.select("#curTime").html("<b>" + "All" + "<b>" + "<br>");
        });
    };

    /**
     * Reset css for all links.
     */
    var clearHighlighting = function () {
        hLink.classed("hiddenLink", true)
            .classed("filteredLink", false);
        link.each(function (l) {
            l.highlighted = false;
        });

        domNodeset.each(function (n) {
            n.highlighted = false;
            n.doi.highlightedChanged();
        });
    };

    /**
     * Get predecessing nodes for highlighting the path by the current node selection.
     * @param n BaseNode extending constructor function.
     */
    var highlightPredPath = function (n) {

        /* Current node is highlighted. */
        n.highlighted = true;
        n.doi.highlightedChanged();

        /* Parent nodes are highlighted too. */
        var pn = n.parent;
        while (pn instanceof provvisDecl.BaseNode === true) {
            pn.highlighted = true;
            pn.doi.highlightedChanged();
            pn = pn.parent;
        }

        /* Get svg link element, and for each predecessor call recursively. */
        n.predLinks.values().forEach(function (l) {
            l.highlighted = true;
            if (!l.hidden)
                d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false).classed("filteredLink", true);
            highlightPredPath(l.source);
        });
    };

    /**
     * Get succeeding nodes for highlighting the path by the current node selection.
     * @param n BaseNode extending constructor function.
     */
    var highlightSuccPath = function (n) {

        /* Current node is highlighted. */
        n.highlighted = true;
        n.doi.highlightedChanged();

        /* Parent nodes are highlighted too. */
        var pn = n.parent;
        while (pn instanceof provvisDecl.BaseNode === true) {
            pn.highlighted = true;
            pn.doi.highlightedChanged();
            pn = pn.parent;
        }

        /* Get svg link element, and for each successor call recursively. */
        n.succLinks.values().forEach(function (l) {
            l.highlighted = true;
            if (!l.hidden)
                d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false).classed("filteredLink", true);

            highlightSuccPath(l.target);
        });
    };

    /**
     * For a node, get first visible parent node coords.
     * @param curN Node to start traversing to its parents.
     * @returns {{x: number, y: number}} X and y coordinates of the first visible parent node.
     */
    var getVisibleNodeCoords = function (curN) {
        var x = 0,
            y = 0;

        while (curN.hidden && curN !== vis.graph) {
            curN = curN.parent;
        }
        while (curN !== vis.graph) {
            x += curN.x;
            y += curN.y;
            curN = curN.parent;
        }
        return {x: x, y: y};
    };

    var updateAnalysisLinks = function (graph) {
        //console.log("#updateAnalysisLinks");

        /* TODO: Check update for highlighting. */
        /* Data join. */
        var ahl = vis.canvas.select("g.aHLinks").selectAll(".hLink")
            .data(graph.aLinks);

        /* Enter. */
        ahl.enter().append("path")
            .classed({"hLink": true})
            .classed("blendedLink", function () {
                return filterAction === "blend" ? true : false;
            }).classed("filteredLink", function (l) {
                return l.filtered;
            }).classed("hiddenLink", function (l) {
                return !l.highlighted;
            }).attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            });

        /* Enter and update. */
        ahl.attr("d", function (l) {
            var srcCoords = getVisibleNodeCoords(l.source),
                tarCoords = getVisibleNodeCoords(l.target);
            if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            } else {
                return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            }
        }).classed("blendedLink", function (l) {
            return !l.filtered && filterAction === "blend" ? true : false;
        }).classed("filteredLink", function (l) {
            return l.filtered;
        }).classed("hiddenLink", function (l) {
            return !l.highlighted;
        }).attr("id", function (l) {
            return "hLinkId-" + l.autoId;
        });

        /* Exit. */
        ahl.exit().remove();

        /* Set dom elements. */
        hLink = d3.selectAll(".hLink");

        /* Data join */
        var al = vis.canvas.select("g.aLinks").selectAll(".link")
            .data(graph.aLinks);

        /* Enter. */
        al.enter().append("path")
            .classed({"link": true, "aLink": true})
            .classed("blendedLink", function (l) {
                return !l.filtered && filterAction === "blend" ? true : false;
            }).classed("filteredLink", function (l) {
                return l.filtered;
            }).classed("hiddenLink", function (l) {
                return l.hidden;
            }).attr("id", function (l) {
                return "linkId-" + l.autoId;
            });

        /* Enter and update. */
        al.attr("d", function (l) {
            var srcCoords = getVisibleNodeCoords(l.source),
                tarCoords = getVisibleNodeCoords(l.target);
            if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            } else {
                return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            }
        }).classed("blendedLink", function (l) {
            return !l.filtered && filterAction === "blend" ? true : false;
        }).classed("filteredLink", function (l) {
            return l.filtered;
        }).classed("hiddenLink", function (l) {
            return l.hidden;
        }).attr("id", function (l) {
            return "linkId-" + l.autoId;
        });

        /* Exit. */
        al.exit().remove();

        /* Set dom elements. */
        aLink = d3.selectAll(".aLink");
        link = d3.selectAll(".link");
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
     * Parses a string into the ISO time format.
     * @param value The time in iso time format.
     * @returns {*} The time in custom format.
     */
    var createCustomTimeFormat = function (value) {
        var isoDate = parseISOTimeFormat(value);
        var customDateFormat = d3.time.format("%b %d, %Y %I:%M:%S %p");
        return customDateFormat(isoDate);
    };

    /**
     * Creates a linear time scale ranging from the first to the last analysis created.
     * @param aNodes Analysis nodes.
     * @param range Linear color scale for domain values.
     */
    var createAnalysistimeColorScale = function (aNodes, range) {
        var min = d3.min(aNodes, function (d) {
                return parseISOTimeFormat(d.start);
            }),
            max = d3.max(aNodes, function (d) {
                return parseISOTimeFormat(d.start);
            });

        return d3.time.scale()
            .domain([min, max])
            .range([range[0], range[1]]);
    };

    /**
     * Draw layered nodes.
     * @param lNodes
     */
    var drawLayerNodes = function (lNodes) {
        layer = vis.canvas.append("g").classed("layers", true).selectAll(".layer")
            .data(lNodes.values())
            .enter().append("g")
            .classed("layer", true)
            .attr("id", function (d) {
                return "gNodeId-" + d.autoId;
            });


        /* TODO: */

    };

    /**
     * Draw analysis nodes.
     * @param aNodes Analysis nodes.
     */
    var drawAnalysisNodes = function (aNodes) {
        layer.each(function (ln) {
            d3.select("#gNodeId-" + ln.autoId).selectAll(".analysis")
                .data(ln.children.values())
                .enter().append("g")
                .classed("analysis", true)
                .attr("id", function (d) {
                    return "gNodeId-" + d.autoId;
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .style("fill", function (d) {
                    return timeColorScale(parseISOTimeFormat(d.start));
                });
        });
        analysis = vis.canvas.select("g.layers").selectAll(".analysis");

        analysis.each(function (an) {
            var self = d3.select(this);

            /* Add a clip-path to restrict labels within the cell area. */
            self.append("defs")
                .append("clipPath")
                .attr("id", "bbClipId-" + an.autoId)
                .append("rect")
                .attr("transform", function () {
                    return "translate(" + (-cell.width / 2 + 1) + "," + (-cell.height / 2 + 1) + ")";
                })
                .attr("width", cell.width - 4)
                .attr("height", cell.height - 2)
                .attr("rx", cell.width / 5)
                .attr("ry", cell.height / 5);

            /* Draw bounding box. */
            var analysisBBox = self.append("g")
                .attr("id", function () {
                    return "BBoxId-" + an.autoId;
                }).classed({"aBBox": true, "BBox": true})
                .attr("transform", function () {
                    return "translate(" + (-cell.width / 2 + 1) + "," + (-cell.height / 2 + 1) + ")";
                });

            analysisBBox.append("rect")
                .attr("width", function () {
                    return cell.width - 2;
                })
                .attr("height", function () {
                    return cell.height - 2;
                })
                .attr("rx", cell.width / 5)
                .attr("ry", cell.height / 5);

            /* Add a clip-path to restrict labels within the cell area. */
            analysisBBox.append("defs")
                .append("clipPath")
                .attr("id", "aBBClipId-" + an.autoId)
                .append("rect")
                .attr("width", cell.width - 4)
                .attr("height", cell.height - 2)
                .attr("rx", cell.width / 5)
                .attr("ry", cell.height / 5);

            /* Time as label. */
            analysisBBox.append("g").classed({"labels": true}).attr("clip-path", "url(#aBBClipId-" + an.autoId + ")")
                .append("text")
                .attr("transform", function () {
                    return "translate(" + 4 + "," + (vis.radius) + ")";
                })
                .attr("class", "aBBoxLabel")
                .text(function (d) {
                    return createCustomTimeFormat(d.start).toString();
                });

            /* Draw analysis node. */
            var analysisNode = self.append("g")
                .attr("id", function () {
                    return "nodeId-" + an.autoId;
                })
                .classed({"aNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false});

            self.append("g").classed({"children": true});

            var aGlyph = analysisNode.append("g").classed({"glyph": true}),
                aLabels = analysisNode.append("g").classed({"labels": true})
                    .attr("clip-path", "url(#bbClipId-" + an.autoId + ")");

            var scaleFactor = 0.75;
            aGlyph.append("polygon")
                .attr("points", function () {
                    return (-1.5 * scaleFactor * vis.radius) + "," + "0" + " " +
                        (-scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius) + " " +
                        (scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius) + " " +
                        (1.5 * scaleFactor * vis.radius) + "," + "0" + " " +
                        (scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius) + " " +
                        (-scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius);
                });

            /* Add text labels. */
            aLabels.append("text")
                .text(function (d) {
                    return d.doi.doiWeightedSum;
                }).attr("class", "nodeDoiLabel")
                .attr("text-anchor", "left")
                .attr("dominant-baseline", "central")
                .style("display", "none");

            aLabels.append("text")
                .attr("transform", function () {
                    return "translate(" + (-cell.width / 2 + 4) + "," + (vis.radius * 1.5) + ")";
                })
                .text(function (d) {
                    return d.children.size() + " x " + d.wfName.toString();
                }).attr("class", "analysisLabel")
                .attr("text-anchor", "left")
                .attr("dominant-baseline", "top")
                .style("display", "inline");
        });

        /* Set dom elements. */
        aNode = d3.selectAll(".aNode");
        aBBox = d3.selectAll(".aBBox");
    };

    /**
     * Draws the subanalalysis containing links.
     * @param san Subanalysis node.
     */
    var drawSubanalysisLinks = function (san) {

        /* Draw highlighting links. */
        var sahl = d3.select("#gNodeId-" + san.autoId).append("g").classed({"saHLinks": true}).selectAll(".hLink")
            .data(san.links.values());

        sahl.enter().append("path")
            .attr("d", function (l) {
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                } else {
                    return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                }
            })
            .classed({
                "hLink": true, "hiddenLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            });

        sahl.exit().remove();

        /* Draw normal links. */
        var sal = d3.select("#gNodeId-" + san.autoId).append("g").classed({"saLinks": true}).selectAll(".link")
            .data(san.links.values());

        sal.enter().append("path")
            .attr("d", function (l) {
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                } else {
                    return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                }
            })
            .classed({
                "link": true, "saLink": true
            })
            .attr("id", function (l) {
                return "linkId-" + l.autoId;
            });
        sal.exit().remove();
    };

    /**
     * Draw subanalysis nodes.
     * @param saNodes Subanalysis nodes.
     */
    var drawSubanalysisNodes = function () {
        analysis.each(function (an) {

            subanalysis = d3.select(this).select(".children").selectAll(".subanalysis")
                .data(function () {
                    return an.children.values();
                })
                .enter().append("g")
                .classed("subanalysis", true)
                .attr("id", function (d) {
                    return "gNodeId-" + d.autoId;
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            subanalysis.each(function (san) {
                var self = d3.select(this);
                /* Draw links for each subanalysis. */

                drawSubanalysisLinks(san);

                /* Compute bounding box for subanalysis child nodes. */
                var saBBoxCoords = getWFBBoxCoords(san, 5);

                /* Add a clip-path to restrict labels within the cell area. */
                self.append("defs")
                    .append("clipPath")
                    .attr("id", "bbClipId-" + san.autoId)
                    .append("rect")
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (-cell.height / 2 + 5) + ")";
                    })
                    .attr("width", cell.width - 10)
                    .attr("height", cell.height - 10);

                /* Draw bounding box. */
                var subanalysisBBox = self.append("g")
                    .attr("id", function () {
                        return "BBoxId-" + san.autoId;
                    }).classed({"saBBox": true, "BBox": true, "hiddenBBox": true})
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (-cell.height / 2 + 5) + ")";
                    });

                /* Add a clip-path to restrict labels within the cell area. */
                subanalysisBBox.append("defs")
                    .append("clipPath")
                    .attr("id", "saBBClipId-" + san.autoId)
                    .append("rect")
                    .attr("width", saBBoxCoords.x.max - saBBoxCoords.x.min - 10)
                    .attr("height", cell.height - 10);

                subanalysisBBox.append("rect")
                    .attr("width", function () {
                        return saBBoxCoords.x.max - saBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return saBBoxCoords.y.max - saBBoxCoords.y.min;
                    })
                    .attr("rx", cell.width / 5)
                    .attr("ry", cell.height / 5);

                /* Workflow name as label. */
                subanalysisBBox.append("g").classed({"labels": true}).attr("clip-path", "url(#saBBClipId-" + san.autoId + ")")
                    .append("text")
                    .attr("transform", function () {
                        return "translate(" + 10 + "," + (vis.radius) + ")";
                    }).attr("class", "saBBoxLabel")
                    .text(function () {
                        var wfName = "dataset";
                        if (typeof vis.graph.workflowData.get(san.parent.wfUuid) !== "undefined") {
                            wfName = vis.graph.workflowData.get(san.parent.wfUuid).name;
                        }
                        return wfName.toString();
                    });

                /* Draw subanalysis node. */
                var subanalysisNode = self.append("g")
                    .attr("id", function () {
                        return "nodeId-" + san.autoId;
                    }).classed({"saNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false});

                self.append("g").classed({"children": true});

                var saGlyph = subanalysisNode.append("g").classed({"glyph": true}),
                    saLabels = subanalysisNode.append("g").classed({"labels": true})
                        .attr("clip-path", "url(#bbClipId-" + san.autoId + ")");

                var scaleFactor = 0.75;
                saGlyph.append("polygon")
                    .attr("points", function () {
                        return "0," + (-scaleFactor * vis.radius) + " " +
                            (scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2) + " " +
                            (scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            "0" + "," + (scaleFactor * vis.radius) + " " +
                            (-scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            (-scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2);
                    });

                /* Add text labels. */
                saLabels.append("text")
                    .text(function (d) {
                        return d.doi.doiWeightedSum;
                    }).attr("class", "nodeDoiLabel")
                    .attr("text-anchor", "left")
                    .attr("dominant-baseline", "central")
                    .style("display", "none");

                saLabels.append("text")
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (vis.radius * 1.5) + ")";
                    })
                    .text(function (d) {
                        var wfName = "dataset";
                        if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                            wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                        }
                        return wfName.toString();
                    }).attr("class", "subanalysisLabel")
                    .attr("text-anchor", "left")
                    .attr("dominant-baseline", "top")
                    .style("display", "inline");
            });
        });


        /* Set dom elements. */
        saNode = d3.selectAll(".saNode");
        subanalysis = d3.selectAll(".subanalysis");
        saBBox = d3.selectAll(".saBBox");

        saLink = d3.selectAll(".saLink");
        link = d3.selectAll(".link");
        hLink = d3.selectAll(".hLink");
    };

    /**
     * Draw nodes.
     * @param nodes All nodes within the graph.
     */
    var drawNodes = function () {
        subanalysis.each(function (san) {
            node = d3.select(this).select(".children").selectAll(".node")
                .data(function () {
                    return san.children.values();
                })
                .enter().append("g")
                .classed("node", true)
                .attr("id", function (d) {
                    return "gNodeId-" + d.autoId;
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            node.each(function (d) {
                var self = d3.select(this);
                self.attr("class", function (d) {
                    return "node " + d.nodeType + "Node";
                }).attr("id", function (d) {
                    return "nodeId-" + d.autoId;
                });

                /* Add a clip-path to restrict labels within the cell area. */
                self.append("defs")
                    .append("clipPath")
                    .attr("id", "bbClipId-" + d.autoId)
                    .append("rect")
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (-cell.height / 2 + 5) + ")";
                    })
                    .attr("width", cell.width - 10)
                    .attr("height", cell.height - 10);

                var nGlyph = self.append("g").classed({"glyph": true}),
                    nLabels = self.append("g").classed({"labels": true})
                        .attr("clip-path", "url(#bbClipId-" + d.autoId + ")");

                var scaleFactor = 0.75;
                if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                    nGlyph
                        .append("circle")
                        .attr("r", function (d) {
                            return d.nodeType === "intermediate" ? 3 * scaleFactor *
                            vis.radius / 4 : scaleFactor * vis.radius;
                        });
                } else {
                    if (d.nodeType === "special") {
                        nGlyph
                            .append("rect")
                            .attr("transform", "translate(" + (-3 * scaleFactor * vis.radius / 4) + "," +
                            (-3 * scaleFactor * vis.radius / 4) + ")")
                            .attr("width", 6 * scaleFactor * vis.radius / 4)
                            .attr("height", 6 * scaleFactor * vis.radius / 4);
                    } else if (d.nodeType === "dt") {
                        nGlyph
                            .append("rect")
                            .attr("transform", function () {
                                return "translate(" + (-scaleFactor * vis.radius / 2) + "," +
                                    (-scaleFactor * vis.radius / 2) + ")" +
                                    "rotate(45 " + (scaleFactor * vis.radius / 2) + "," +
                                    (scaleFactor * vis.radius / 2) + ")";
                            })
                            .attr("width", scaleFactor * vis.radius)
                            .attr("height", scaleFactor * vis.radius);
                    }
                }

                nLabels.append("text")
                    .text(function (d) {
                        return d.doi.doiWeightedSum;
                    }).attr("class", "nodeDoiLabel")
                    .attr("text-anchor", "left")
                    .attr("dominant-baseline", "central")
                    .style("display", "none");

                nLabels.filter(function (d) {
                    return d.nodeType === "stored";
                }).append("text")
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (vis.radius * 1.5) + ")";
                    })
                    .text(function (d) {
                        return d.attributes.get("name");
                    }).attr("class", "nodeAttrLabel")
                    .attr("text-anchor", "left")
                    .attr("dominant-baseline", "top")
                    .style("display", "inline");
            });
        });
        /* Set node dom element. */
        node = d3.selectAll(".node");
    };

    /**
     * Compute bounding box for child nodes.
     * @param n BaseNode.
     * @param offset Cell offset.
     * @returns {{x: {min: *, max: *}, y: {min: *, max: *}}} Min and max x, y coords.
     */
    var getWFBBoxCoords = function (n, offset) {
        var minX, minY, maxX, maxY = 0;

        if (n.children.empty() || !n.hidden) {
            minX = (-cell.width / 2 + offset);
            maxX = (cell.width / 2 - offset);
            minY = (-cell.width / 2 + offset);
            maxY = (cell.width / 2 - offset);
        } else {
            minX = d3.min(n.children.values(), function (d) {
                return d.x - cell.width / 2 + offset;
            });
            maxX = d3.max(n.children.values(), function (d) {
                return d.x + cell.width / 2 - offset;
            });
            minY = d3.min(n.children.values(), function (d) {
                return d.y - cell.height / 2 + offset;
            });
            maxY = d3.max(n.children.values(), function (d) {
                return d.y + cell.height / 2 - offset;
            });
        }

        return {x: {min: minX, max: maxX}, y: {min: minY, max: maxY}};
    };

    /**
     * Compute bounding box for expanded analysis nodes.
     * @param an Analysis node.
     * @param offset Cell offset.
     * @returns {{x: {min: number, max: number}, y: {min: number, max: number}}} Min and max x, y coords.
     */
    var getABBoxCoords = function (an, offset) {

        if (!offset) {
            offset = 0;
        }

        var minX = !an.hidden ? an.x : d3.min(an.children.values(), function (san) {
                return !san.hidden ? an.x + san.x : d3.min(san.children.values(), function (cn) {
                    return an.x + san.x + cn.x;
                });
            }),
            maxX = !an.hidden ? an.x : d3.max(an.children.values(), function (san) {
                return !san.hidden ? an.x + san.x : d3.max(san.children.values(), function (cn) {
                    return an.x + san.x + cn.x;
                });
            }),
            minY = !an.hidden ? an.y : d3.min(an.children.values(), function (san) {
                return !san.hidden ? an.y + san.y : d3.min(san.children.values(), function (cn) {
                    return an.y + san.y + cn.y;
                });
            }),
            maxY = !an.hidden ? an.y : d3.max(an.children.values(), function (san) {
                return !san.hidden ? an.y + san.y : d3.max(san.children.values(), function (cn) {
                    return an.y + san.y + cn.y;
                });
            });

        return {
            x: {min: minX + offset, max: maxX + cell.width - offset},
            y: {min: minY + offset, max: maxY + cell.height - offset}
        };
    };


    /**
     * Dagre layout for analysis.
     * @param san Graph.
     */
    var dagreDynamicLayout = function (graph) {

        var g = new dagre.graphlib.Graph();

        g.setGraph({rankdir: "LR", nodesep: 0, edgesep: 0, ranksep: 0, marginx: 0, marginy: 0});

        g.setDefaultEdgeLabel(function () {
            return {};
        });

        var anBBoxCoords = {},
            curWidth = 0,
            curHeight = 0;

        graph.aNodes.forEach(function (an) {
            anBBoxCoords = getABBoxCoords(an, 0);
            curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            curHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;

            g.setNode(an.autoId, {label: an.autoId, width: curWidth, height: curHeight});
        });

        graph.aLinks.forEach(function (l) {
            g.setEdge(l.source.parent.parent.autoId, l.target.parent.parent.autoId, {
                minlen: 1,
                weight: 1,
                width: 0,
                height: 0,
                labelpos: "r",
                labeloffset: 0
            });
        });

        dagre.layout(g);

        var dlANodes = d3.entries(g._nodes);

        graph.aNodes.forEach(function (an) {
            anBBoxCoords = getABBoxCoords(an);
            curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
            curHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;

            an.x = dlANodes.filter(function (d) {
                return d.key === an.autoId.toString();
            })[0].value.x - curWidth / 2;

            an.y = dlANodes.filter(function (d) {
                return d.key === an.autoId.toString();
            })[0].value.y - curHeight / 2;

            dragAnalysisNode(an, d3.select("#gNodeId-" + an.autoId));
        });
    };

    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     * @param d Node.
     * @param keyStroke Keystroke being pressed at mouse click.
     */
    var handleCollapseExpandNode = function (d, keyStroke) {
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        var anBBoxCoords = Object.create(null),
            wfBBoxCoords = Object.create(null),
            siblings = [],
            curAN = Object.create(null);

        /* Expand. */
        if (keyStroke === "e" && (d.nodeType === "analysis" || d.nodeType === "subanalysis")) {

            curAN = d;
            if (d instanceof provvisDecl.Subanalysis) {
                curAN = curAN.parent;
            }

            /* Set node visibility. */
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", true);
            d.hidden = true;
            d.children.values().forEach(function (cn) {
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", false);
                cn.hidden = false;

                if (!cn.children.empty()) {
                    cn.children.values().forEach(function (n) {
                        d3.select("#nodeId-" + n.autoId).classed("hiddenNode", true);
                        n.hidden = true;
                    });
                }
            });

            /* Set link visibility. */
            if (d.nodeType === "subanalysis") {
                d.links.values().forEach(function (l) {
                    l.hidden = false;
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                });
            } else {
                d.children.values().forEach(function (san) {
                    san.links.values().forEach(function (l) {
                        l.hidden = true;
                        d3.select("#linkId-" + l.autoId).classed("hiddenLink", true);
                        if (l.highlighted) {
                            d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", true);
                        }
                    });
                });
            }

            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                    l.hidden = false;
                });
            });


            if (d.nodeType === "subanalysis") {

                /* Set saBBox visibility. */
                d3.select("#BBoxId-" + d.autoId).classed("hiddenBBox", false);

                /* Update. */
                updateLink(d.parent, d.parent.x, d.parent.y);
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);

                /* Shift sibling subanalyses vertical. */
                siblings = d.parent.children.values().filter(function (san) {
                    return san !== d && san.y > d.y;
                });
                wfBBoxCoords = getWFBBoxCoords(d, 1);
                siblings.forEach(function (san) {
                    san.y += wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
                    updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
                });

                /* Adjust analysis bounding box. */
                anBBoxCoords = getABBoxCoords(d.parent, 1);
                d3.selectAll("#BBoxId-" + d.parent.autoId + ", #aBBClipId-" + d.parent.autoId).selectAll("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min;
                    });
            } else {

                /* Adjust analysis bounding box. */
                anBBoxCoords = getABBoxCoords(d, 1);
                d3.select("#BBoxId-" + d.autoId).select("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min;
                    });

                /* Update. */
                updateLink(d, d.x, d.y);
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);
            }

        } else if (keyStroke === "c" && d.nodeType !== "analysis") {
            /* Collapse. */

            /* Collapse subanalyses. */
            if (d.nodeType === "subanalysis") {
                //console.log("#COLLAPSE subanalysis " + d.autoId);

                curAN = d.parent;

            } else {
                //console.log("#COLLAPSE node " + d.autoId);

                /* Collapse workflow. */
                curAN = d.parent.parent;
                wfBBoxCoords = getWFBBoxCoords(d.parent, 1);

                /* Shift sibling subanalyses vertical. */
                siblings = curAN.children.values().filter(function (san) {
                    return san !== d.parent && san.y > d.parent.y;
                });
                siblings.forEach(function (san) {
                    san.y -= wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
                    updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
                });
            }

            /* Set node visibility. */
            d.parent.hidden = false;
            d3.select("#nodeId-" + d.parent.autoId).classed("hiddenNode", false);
            hideChildNodes(d.parent);

            /* Set saBBox visibility. */
            if (d.nodeType === "subanalysis") {
                d3.select("#BBoxId-" + d.autoId).classed("hiddenBBox", true);
            } else {
                d3.select("#BBoxId-" + d.parent.autoId).classed("hiddenBBox", true);
            }

            /* Set link visibility. */
            d.parent.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
            d.parent.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                    l.hidden = false;
                });
            });

            if (d.nodeType === "subanalysis") {
                curAN = d.parent;

                /* Resize analysis bounding box. */
                d3.selectAll("#BBoxId-" + curAN.autoId + ", #aBBClipId-" + curAN.autoId).selectAll("rect")
                    .attr("width", function () {
                        return (d3.select(this.parentElement).attr("id") === "BBoxId-" + curAN.autoId) ?
                        cell.width - 2 : cell.width - 4;
                    })
                    .attr("height", function () {
                        return cell.height - 2;
                    });

                /* Update links. */
                updateLink(curAN, curAN.x, curAN.y);

            } else {
                curAN = d.parent.parent;

                /* Set saBBox visibility. */
                d3.select("#BBoxId-" + d.autoId).classed("hiddenBBox", false);

                /* Update links. */
                updateLink(curAN, curAN.x, curAN.y);

                updateNode(d3.select("#gNodeId-" + curAN.autoId), curAN, curAN.x, curAN.y);

                /* Compute bounding box for analysis child nodes. */
                anBBoxCoords = getABBoxCoords(curAN, 1);

                /* Adjust analysis bounding box. */
                d3.selectAll("#BBoxId-" + curAN.autoId + ", #aBBClipId-" + curAN.autoId).selectAll("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min;
                    });

                /* If the selected subanalysis is the last remaining to collapse, adjust bounding box and clippath. */
                if (!curAN.children.values().some(function (san) {
                        return san.hidden;
                    })) {
                    /* Compute bounding box for analysis child nodes. */
                    anBBoxCoords = getABBoxCoords(curAN, 1);

                    /* Adjust analysis bounding box. */
                    d3.select("#BBoxId-" + curAN.autoId).select("rect")
                        .attr("width", function () {
                            return anBBoxCoords.x.max - anBBoxCoords.x.min;
                        })
                        .attr("height", function () {
                            return anBBoxCoords.y.max - anBBoxCoords.y.min;
                        });

                    /* Adjust clippath. */
                    d3.select("#aBBClipId-" + curAN.autoId).select("rect")
                        .attr("width", cell.width - 4)
                        .attr("height", cell.height - 2)
                        .attr("rx", cell.width / 5)
                        .attr("ry", cell.height / 5);
                }
                /* Update links. */
                updateLink(curAN, curAN.x, curAN.y);
            }
        }
        clearNodeSelection();

        /* Recompute layout. */
        dagreDynamicLayout(vis.graph);

        fitGraphToWindow(nodeLinkTransitionTime);
    };

    /**
     * Path highlighting.
     * @param d Node.
     * @param keyStroke Keystroke being pressed at mouse click.
     */
    var handlePathHighlighting = function (d, keyStroke) {

        /* Clear any highlighting. */
        clearHighlighting();

        if (keyStroke === "s") {

            /* Highlight path. */
            highlightSuccPath(d);
        } else if (keyStroke === "p") {

            /* Highlight path. */
            highlightPredPath(d);
        }

        /* TODO: Temporarily disabled. */
        updateNodeDoi();
    };

    /**
     * Fit visualization onto free windows space.
     * @param transitionTime The time in milliseconds for the duration of the animation.
     */
    var fitGraphToWindow = function (transitionTime) {

        var min = [0, 0],
            max = [0, 0];

        vis.graph.aNodes.forEach(function (an) {
            var anBBox = getABBoxCoords(an, 0);
            if (anBBox.x.min < min[0]) {
                min[0] = anBBox.x.min;
            }
            if (anBBox.x.max > max[0]) {
                max[0] = anBBox.x.max;
            }
            if (anBBox.y.min < min[1]) {
                min[1] = anBBox.y.min;
            }
            if (anBBox.y.max > max[1]) {
                max[1] = anBBox.y.max;
            }
        });

        var delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(vis.width / delta[0]), (vis.height / delta[1])],
        /* Maximize scale to factor 3. */
            newScale = d3.min(factor.concat([3])) * 0.9,
            newPos = [vis.margin.left * 2 * newScale,
                ((vis.height - delta[1] * newScale) / 2 + vis.margin.top * 2)];

        vis.canvas
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");

        vis.zoom.translate(newPos);
        vis.zoom.scale(newScale);

        /* Hide and show labels at specific threshold. */
        setTimeout(function () {
            if (newScale < 1) {
                vis.canvas.selectAll(".labels")
                    .classed("hiddenLabel", true);
            } else {
                vis.canvas.selectAll(".labels")
                    .classed("hiddenLabel", false);
            }
        }, transitionTime);


        /* Background rectangle fix. */
        vis.rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," +
        (-newPos[1] / newScale) + ")" + " scale(" + (1 / newScale) + ")");

        /* Quick fix to exclude scale from text labels. */
        vis.canvas.selectAll(".aBBoxLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 4 + "," + (vis.radius) + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".saBBoxLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 10 + "," + (vis.radius) + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".nodeDoiLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + (-cell.width / 2 + 2) + "," + vis.radius * 1.5 + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".nodeAttrLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + (-cell.width / 2 + 5) + "," + vis.radius * 1.5 + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".subanalysisLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + (-cell.width / 2 + 5) + "," + vis.radius * 1.5 + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".analysisLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + (-cell.width / 2 + 4) + "," + vis.radius * 1.5 + ") scale(" + (1 / newScale) + ")");
    };

    /**
     * Wrapper function to invoke scale and transformation onto the visualization.
     */
    var handleFitGraphToWindow = function () {
        fitGraphToWindow(1000);
    };

    /**
     * Clears node selection.
     */
    var clearNodeSelection = function () {
        domNodeset.each(function (d) {
            d.selected = false;
            d3.select(this).classed("selectedNode", false);
            d.doi.selectedChanged();
        });

        vis.nodeTable.select("#nodeTitle").html("<b>" + "Node: " + "<b>" + " - ");
        vis.nodeTable.select("#provenance-table-content").html("");

        selectedNodeSet = d3.map();
    };

    /**
     * Left click on a node to reveal additional details.
     * @param d Node
     */
    var handleNodeSelection = function (d) {
        /* Update selection. */
        if (d.selected) {
            d.selected = false;
            selectedNodeSet.remove(d.autoId);
        } else {
            d.selected = true;
            selectedNodeSet.set(d.autoId, d);
        }

        d3.select("#nodeId-" + d.autoId).classed("selectedNode", d.selected);
        d.doi.selectedChanged();

        /* TODO: Temporarily disabled. */
        //updateNodeDoi();
    };

    /**
     * Updated table on node selection.
     * @param selNode Selected node.
     */
    var updateTableContent = function (selNode) {
        var title = " - ",
            data = Object.create(null);

        switch (selNode.nodeType) {
            case "raw":
            case "special":
            case "intermediate":
            case "stored":
                data = vis.graph.nodeData.get(selNode.uuid);
                if (typeof data !== "undefined") {
                    title = "<b>" + selNode.fileType + ": " + "<b>";
                    if (data.file_url !== null) {
                        title += "<a href=" + data.file_url + ">" + data.name + "</a>";
                    } else {
                        title += " - ";
                    }
                }
                break;

            case "dt":
                /* TODO: Add tool_state parameters column. */
                data = vis.graph.nodeData.get(selNode.uuid);
                if (typeof data !== "undefined") {
                    title = "<b>" + selNode.fileType + ": " + "<b>";
                    if (data.file_url !== null) {
                        title += "<a href=" + data.file_url + ">" + data.name + "</a>";
                    } else {
                        title += " - ";
                    }
                }
                break;

            case "subanalysis":
                data = vis.graph.workflowData.get(selNode.parent.wfUuid);
                if (typeof data !== "undefined") {
                    title = "<b>" + "Subanalysis: " + "<b>" + "<a href=/workflows/" + selNode.parent.wfUuid + ">" +
                    data.name + "</a>";
                } else {
                    title = "<b>" + "Dataset " + "<b>";
                }
                break;

            case "analysis":

                data = vis.graph.analysisData.get(selNode.uuid);
                if (typeof data !== "undefined") {
                    title = "<b>" + "Analysis: " + "<b>" + "<a href=/workflows/" + data.uuid + ">" +
                    data.name + "</a>";
                } else {
                    title = "<b>" + "Dataset " + "<b>";
                }
                break;
        }

        /* Update node title. */
        vis.nodeTable.select("#nodeTitle").html(title);

        /* Update table content. */
        vis.nodeTable.selectAll("table")
            .data([0])
            .enter()
            .append("table")
            .attr("id", "provenance-table-content")
            .attr("class", "table table-striped table-condensed");
        var table = vis.nodeTable.select("table");

        table.selectAll("thead")
            .data([0])
            .enter()
            .append("thead");
        var tHead = table.select("thead");

        table.selectAll("tbody")
            .data([0])
            .enter()
            .append("tbody");
        var tBody = table.select("tbody");

        /* Header row. */
        var th = tHead.selectAll("th")
            .data(d3.keys(data));

        th.enter().append("th");
        th.text(function (d) {
            return d;
        });
        th.exit().remove();

        /* Body rows. */
        var rows = tBody.selectAll("tr")
            .data([d3.values(data)]);
        rows.enter().append("tr");
        rows.exit().remove();

        /* Table data. */
        var cells = rows.selectAll("td")
            .data(function (d) {
                return d;
            });
        cells.enter().append("td");
        cells.text(function (d) {
            return d;
        });
        cells.exit().remove();

        $("#provenance-support-view").css({"top": ($("#provenance-table").height()) + "px"});
    };

    /**
     * Get workflow name string.
     * @param n Node of type BaseNode.
     * @returns {string} The name string.
     */
    var getWfNameByNode = function (n) {
        var wfName = "dataset",
            an = n;
        while (!(an instanceof provvisDecl.Analysis)) {
            an = an.parent;
        }
        if (typeof vis.graph.workflowData.get(an.wfUuid) !== "undefined") {
            wfName = vis.graph.workflowData.get(an.wfUuid).name;
        }
        return wfName.toString();
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
            var self = d3.select(this);
            var ttStr = createHTMLKeyValuePair("Name", d.name) + "<br>" +
                createHTMLKeyValuePair("Type", d.fileType) + "<br>" +
                createHTMLKeyValuePair("File Url", d.fileUrl) + "<br>" +
                createHTMLKeyValuePair("UUID", d.uuid) + "<br>";
            d.attributes.forEach(function (key, value) {
                ttStr += createHTMLKeyValuePair(key, value) + "<br>";
            });
            showTooltip(ttStr, event);
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            var ttStr = createHTMLKeyValuePair("Name", d.name) + "<br>" +
                createHTMLKeyValuePair("Type", d.fileType) + "<br>" +
                createHTMLKeyValuePair("File Url", d.fileUrl) + "<br>" +
                createHTMLKeyValuePair("UUID", d.uuid) + "<br>";
            d.attributes.forEach(function (key, value) {
                ttStr += createHTMLKeyValuePair(key, value) + "<br>";
            });
            showTooltip(ttStr, event);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            hideTooltip();
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* Subanalysis tooltips. */
        saNode.on("mouseover", function (d) {
            var self = d3.select(this);
            /*showTooltip(
             createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
             createHTMLKeyValuePair("Workflow", getWfNameByNode(d)) + "<br>" +
             "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);*/
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            /*showTooltip(
             createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
             createHTMLKeyValuePair("Workflow", getWfNameByNode(d)) + "<br>" +
             "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);*/
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            /*hideTooltip();*/
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* Analysis tolltips. */
        aNode.on("mouseover", function (d) {
            var self = d3.select(this);
            /* showTooltip(
             createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
             createHTMLKeyValuePair("Workflow", getWfNameByNode(d)) + "<br>" +
             createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);*/
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            /*showTooltip(
             createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
             createHTMLKeyValuePair("Workflow", getWfNameByNode(d)) + "<br>" +
             createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);*/
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            /*hideTooltip();*/
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* On mouseover subanalysis bounding box. */
        saBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".labels").attr("clip-path", "url(#saBBClipId-" + d.autoId + ")");
        });

        /* On mouseover analysis bounding box. */
        aBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".labels").attr("clip-path", "url(#aBBClipId-" + d.autoId + ")");
        });
    };

    /**
     * Adds tooltips to nodes.
     */
    var handleDebugTooltips = function () {

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
            var self = d3.select(this);
            showTooltip(
                createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(
                createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            hideTooltip();
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* Subanalysis tooltips. */
        saNode.on("mouseover", function (d) {
            var self = d3.select(this);
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("x", d.x) + "<br>" +
            createHTMLKeyValuePair("y", d.y), event);
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("x", d.x) + "<br>" +
            createHTMLKeyValuePair("y", d.y), event);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            hideTooltip();
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* Analysis tolltips. */
        aNode.on("mouseover", function (d) {
            var self = d3.select(this);
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("x", d.x) + "<br>" +
            createHTMLKeyValuePair("y", d.y), event);
            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("x", d.x) + "<br>" +
            createHTMLKeyValuePair("y", d.y), event);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            hideTooltip();
            self.classed("mouseoverNode", false);
            self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
        });

        /* On mouseover subanalysis bounding box. */
        saBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".labels").attr("clip-path", "url(#saBBClipId-" + d.autoId + ")");
        });

        /* On mouseover analysis bounding box. */
        aBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".labels").attr("clip-path", "url(#aBBClipId-" + d.autoId + ")");
        });

        /* Link tooltips. */
        link.on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
            createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
            createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mouseout", function () {
            hideTooltip();
        });

        aLink.on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
            createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
            createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
            createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mouseout", function () {
            hideTooltip();
        });
    };

    /**
     * Expand all analsyes into workflow nodes.
     */
    var showAllWorkflows = function () {

        /* Set subanalysis visibility. */
        saNode.each(function (san) {
            san.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        /* Set analysis visibility. */
        aNode.each(function (an) {
            an.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        /* Set node visibility. */
        node.each(function (n) {
            n.hidden = false;
            d3.select(this).classed("hiddenNode", false);
        });

        /* Set link visibility. */
        link.each(function (l) {
            d3.select(this).classed("hiddenLink", false);
            l.hidden = false;
            if (l.highlighted) {
                d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
            }
        });

        aNode.each(function (an) {
            /* Adjust subanalysis coords. */
            var wfBBoxCoords = getWFBBoxCoords(an.children.values()[0], 1);
            an.children.values().sort(function (a, b) {
                return a.y - b.y;
            }).forEach(function (san, i) {
                san.y = i * (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
                updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
            });

            /* Adjust analysis bounding box. */
            var anBBoxCoords = getABBoxCoords(an, 1);
            d3.selectAll("#BBoxId-" + an.autoId + ", #aBBClipId-" + an.autoId).selectAll("rect")
                .attr("width", function () {
                    return anBBoxCoords.x.max - anBBoxCoords.x.min;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min;
                });
        });

        /* Set saBBox visibility. */
        saBBox.classed("hiddenBBox", false);

        /* Show BBox label. */
        aBBox.select("text").classed("hiddenLabel", false);

        /* Update connections. */
        aNode.each(function (an) {
            updateLink(an, an.x, an.y);
        });
    };

    /**
     * Collapse all analyses into single subanalysis nodes.
     */
    var showAllSubanalyses = function () {
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Hide analyses. */
        aNode.each(function (an) {
            d3.select(this).classed("hiddenNode", true);
            an.hidden = true;
        });

        /* Set node visibility. */
        saNode.each(function (san) {
            d3.select(this).classed("hiddenNode", false);
            san.hidden = false;
            hideChildNodes(san);
        });

        /* Set link visibility. */
        saNode.each(function (san) {
            san.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
            san.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    l.hidden = false;
                });
            });
        });

        /* Show BBox label. */
        aBBox.select("text")
            .classed("hiddenLabel", false);

        /* Hide subanalysis bounding boxes. */
        saBBox.classed("hiddenBBox", true);

        aNode.each(function (an) {

            /* Adjust subanalysis coords. */
            var wfBBoxCoords = getWFBBoxCoords(an.children.values()[0], 1);
            an.children.values().sort(function (a, b) {
                return a.y - b.y;
            }).forEach(function (san, i) {
                san.y = i * (wfBBoxCoords.y.max - wfBBoxCoords.y.min);
                updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
            });

            /* Adjust analysis bounding box. */
            var anBBoxCoords = getABBoxCoords(an, 1);
            d3.selectAll("#BBoxId-" + an.autoId + ", #aBBClipId-" + an.autoId).selectAll("rect")
                .attr("width", function () {
                    return anBBoxCoords.x.max - anBBoxCoords.x.min;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min;
                });

            updateLink(an, an.x, an.y);
        });
    };

    /**
     * Collapse all analyses into single analysis nodes.
     */
    var showAllAnalyses = function () {
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Set node visibility. */
        aNode.each(function (an) {
            d3.select(this).classed("hiddenNode", false);
            an.hidden = false;
            hideChildNodes(an);
        });

        /* Set link visibility. */
        aNode.each(function (an) {
            an.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
            an.inputs.values().forEach(function (ain) {
                ain.predLinks.values().forEach(function (l) {
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    l.hidden = false;
                });
            });
        });

        /* Hide subanalysis bounding boxes. */
        saBBox.classed("hiddenBBox", true);

        aNode.each(function (an) {
            /* Adjust subanalysis coords. */
            an.children.values().sort(function (a, b) {
                return a.y - b.y;
            }).forEach(function (san, i) {
                san.y = i * vis.cell.height;
                updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
            });

            /* Adjust analysis bounding box. */
            var anBBoxCoords = getABBoxCoords(an, 1);
            d3.selectAll("#BBoxId-" + an.autoId + ", #aBBClipId-" + an.autoId).selectAll("rect")
                .attr("width", function () {
                    return anBBoxCoords.x.max - anBBoxCoords.x.min;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min;
                });

            updateLink(an, an.x, an.y);
        });
    };

    /**
     * Handle interaction controls.
     * @param graph Provenance graph object.
     */
    var handleToolbar = function (graph) {

        $("#prov-ctrl-analyses-click").click(function () {
            showAllAnalyses();
            dagreDynamicLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        $("#prov-ctrl-subanalyses-click").click(function () {
            showAllSubanalyses();
            dagreDynamicLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        $("#prov-ctrl-workflows-click").click(function () {
            showAllWorkflows();
            dagreDynamicLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        /* Switch link styles. */
        $("[id^=prov-ctrl-links-list-]").click(function () {
            switch ($(this).text()) {
                case "Bezier":
                    $("#prov-ctrl-links-list-straight").find("input[type='radio']").prop("checked", false);
                    break;
                case "Straight":
                    $("#prov-ctrl-links-list-bezier").find("input[type='radio']").prop("checked", false);
                    break;
            }
            $(this).find("input[type='radio']").prop("checked", true);

            aNode.each(function (an) {
                updateLink(an, an.x, an.y);
                an.children.values().forEach(function (san) {
                    san.links.values().forEach(function (l) {
                        /* Redraw links within subanalysis. */
                        d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
                            if ($("#prov-ctrl-links-list-bezier").find("input[type='radio']").prop("checked")) {
                                return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                            } else {
                                return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                            }
                        });
                    });
                });
            });
        });

        /* Switch time-dependant color scheme. */
        $("[id^=prov-ctrl-time-enc-list-]").click(function () {

            $(this).find("input[type='radio']").prop("checked", true);

            var selectedColorScheme = $(this).find("label").text();
            switch (selectedColorScheme) {
                case "Blue":
                    timeColorScale.range(["white", "darkblue"]);
                    $("#prov-ctrl-time-enc-list-gs").find("input[type='radio']").prop("checked", false);
                    break;
                case "Grayscale":
                    timeColorScale.range(["white", "black"]);
                    $("#prov-ctrl-time-enc-list-blue").find("input[type='radio']").prop("checked", false);
                    break;
            }

            aNode.style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.start));
            });
            saNode.style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.parent.start));
            });
            node.style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.parent.parent.start));
            });
        });

        /* Show and hide doi labels. */
        $("#prov-ctrl-show-doi").click(function () {
            if (!$("#prov-ctrl-show-doi").find("input[type='checkbox']").is(":checked")) {
                d3.selectAll(".nodeDoiLabel").style("display", "none");
            } else {
                d3.selectAll(".nodeDoiLabel").style("display", "inline");
            }
        });

        /* TODO: BUG: On repositioning table and support view. */
        /* Show and hide table. */
        $("#prov-ctrl-show-table").click(function () {
            if (!$("#prov-ctrl-show-table").find("input[type='checkbox']").is(":checked")) {
                d3.select("#provenance-table").style("display", "none");
                $("#provenance-support-view").css({"top": "0px"});
            } else {
                d3.select("#provenance-table").style("display", "block");
                $("#provenance-support-view").css({"top": ($("#provenance-table").height()) + "px"});
            }
        });

        /* Show and hide support view. */
        $("#prov-ctrl-show-support-view").click(function () {
            if (!$("#prov-ctrl-show-support-view").find("input[type='checkbox']").is(":checked")) {
                d3.select("#provenance-support-view").style("display", "none");
            } else {
                d3.select("#provenance-support-view").style("display", "block");
            }

            if ($("#prov-ctrl-show-table").hasClass("active")) {
                $("#provenance-support-view").css({"top": ($("#provenance-table").height()) + "px"});
            } else {
                $("#provenance-support-view").css({"top": "0px"});
            }
        });

        /* Switch filter action. */
        $("[id^=prov-ctrl-filter-list-]").click(function () {

            $(this).find("input[type='radio']").prop("checked", true);

            var selectedFilterAction = $(this).find("label").text();
            switch (selectedFilterAction) {
                case "Hide":
                    $("#prov-ctrl-filter-list-blend").find("input[type='radio']").prop("checked", false);
                    filterAction = "hide";
                    break;
                case "Blend":
                    $("#prov-ctrl-filter-list-hide").find("input[type='radio']").prop("checked", false);
                    filterAction = "blend";
                    break;
            }
            runRenderUpdatePrivate(vis, lastSolrResponse);
        });

        /* Choose visible node attribute. */
        $("[id^=prov-ctrl-visible-attribute-list-]").click(function () {

            /* Set and get chosen attribute as active. */
            $(this).find("input[type='radio']").prop("checked", true);
            var selAttrName = $(this).find("label").text();

            /* On click, set current to active and unselect others. */
            $("#prov-ctrl-visible-attribute-list > li").each(function (idx, li) {
                var item = $(li);
                if (item[0].id !== ("prov-ctrl-visible-attribute-list-" + selAttrName)) {
                    item.find("input[type='radio']").prop("checked", false);
                }
            });

            /* Change attribute label on every node. */
            graph.nodes.filter(function (d) {
                return d.nodeType === "stored";
            }).forEach(function (n) {
                d3.select("#nodeId-" + n.autoId).select(".nodeAttrLabel").text(n.attributes.get(selAttrName));
            });

        });
    };

    /**
     * Handle events.
     * @param graph Provenance graph object.
     */
    var handleEvents = function (graph) {

        handleToolbar(graph);

        /* Handle click separation on nodes. */
        var domNodesetClickTimeout;
        domNodeset.on("click", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(domNodesetClickTimeout);


            /* Click event is executed after 100ms unless the double click event below clears the click event timeout.*/
            domNodesetClickTimeout = setTimeout(function () {
                if (!draggingActive) {
                    handleNodeSelection(d);
                    updateTableContent(d);
                }
            }, 200);
        });

        domNodeset.on("dblclick", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(domNodesetClickTimeout);

            /* Double click event is executed when this event is triggered before the click timeout has finished. */
            handleCollapseExpandNode(d, "e");
        });

        /* Handle click separation on other dom elements. */
        var bRectClickTimeout;
        d3.selectAll(".brect, .link, .hLink, .vLine, .hLine", ".cell").on("click", function () {
            if (d3.event.defaultPrevented) return;
            clearTimeout(bRectClickTimeout);

            /* Click event is executed after 100ms unless the double click event below clears the click event timeout.*/
            bRectClickTimeout = setTimeout(function () {
                clearHighlighting(graph.links);
                clearNodeSelection();

                updateNodeDoi();
            }, 200);
        });

        d3.selectAll(".brect, .link, .hLink, .vLine, .hLine, .cell").on("dblclick", function () {
            if (d3.event.defaultPrevented) return;
            clearTimeout(bRectClickTimeout);

            /* Double click event is executed when this event is triggered before the click timeout has finished. */
            handleFitGraphToWindow();
        });

        /* Handle tooltips. */
        handleTooltips();
        //handleDebugTooltips();

        /* Collapse on bounding box click.*/
        saBBox.on("click", function (d) {
            if (!draggingActive) {
                handleCollapseExpandNode(d.children.values()[0], "c");

                /* Deselect. */
                clearNodeSelection();

                /* TODO: Temporarily disabled. */
                /* Update node doi. */
                //updateNodeDoi();
            }
        });

        /* TODO: on bounding box double click, expand all containing nodes. */

        /* Collapse on bounding box click.*/
        aBBox.on("click", function (d) {
            if (!draggingActive) {
                d.children.values().forEach(function (san) {
                    if (!san.children.values()[0].hidden) {
                        handleCollapseExpandNode(san.children.values()[0], "c");
                    }
                });
                handleCollapseExpandNode(d.children.values()[0], "c");


                /* Deselect. */
                clearNodeSelection();

                /* TODO: Temporarily disabled. */
                /* Update node doi. */
                //updateNodeDoi();
            }
        });

        /* TODO: Rewrite with js library. */
        var keydown = function () {
            d3.event.preventDefault();

            if (selectedNodeSet.empty()) return;

            selectedNodeSet.values().forEach(function (d) {
                switch (d3.event.keyCode) {

                    case 67: /* c => collapse*/
                        handleCollapseExpandNode(d, "c");
                        break;
                    case 69: /* e => expand*/
                        handleCollapseExpandNode(d, "e");
                        break;
                    case 80: /* l => highlight predecessors */
                        handlePathHighlighting(d, "p");
                        break;
                    case 83: /* r => highlight successors */
                        handlePathHighlighting(d, "s");
                        break;
                }
            });
        };

        d3.select("body").on("keydown", keydown);
    };

    /**
     * Compute doi weight based on analysis start time.
     * @param aNodes Analysis nodes.
     */
    var initDoiTimeComponent = function (aNodes) {
        var min = parseISOTimeFormat(new Date(0)),
            max = parseISOTimeFormat(new Date(0));

        if (aNodes.length > 1) {
            min = d3.min(aNodes, function (d) {
                return parseISOTimeFormat(d.start);
            });
            max = d3.max(aNodes, function (d) {
                return parseISOTimeFormat(d.start);
            });
        }

        var doiTimeScale = d3.time.scale()
            .domain([min, max])
            .range([0.0, 1.0]);

        aNodes.forEach(function (an) {
            an.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
            an.children.values().forEach(function (san) {
                san.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
                san.children.values().forEach(function (n) {
                    n.doi.initTimeComponent(doiTimeScale(parseISOTimeFormat(an.start)));
                });
            });
        });
    };

    /**
     * Compute doi weight based on nodes initially set as filtered.
     * @param aNodes Analysis nodes.
     */
    var initDoiFilterComponent = function (aNodes) {
        aNodes.forEach(function (an) {
            an.filtered = true;
            an.doi.filteredChanged();

            an.children.values().forEach(function (san) {
                san.filtered = true;
                san.doi.filteredChanged();

                san.children.values().forEach(function (n) {
                    n.filtered = true;
                    n.doi.filteredChanged();
                });
            });
        });
    };

    /**
     * Concats an array of dom elements.
     * @param domArr An array of dom class selector strings.
     */
    var concatDomClassElements = function (domArr) {
        var domClassStr = "";
        domArr.forEach(function (d) {
            domClassStr += "." + d + ",";
        });

        return d3.selectAll(domClassStr.substr(0, domClassStr.length - 1));
    };

    /**
     * Main render module function.
     * @param provVis The provenance visualization root object.
     */
    var runRenderPrivate = function (provVis) {
        /* Save vis object to module scope. */
        vis = provVis;
        cell = provVis.cell;

        aNodesBAK = vis.graph.aNodes;
        saNodesBAK = vis.graph.saNodes;
        nodesBAK = vis.graph.nodes;
        aLinksBAK = vis.graph.aLinks;

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.l.width;
        depth = vis.graph.l.depth;

        timeColorScale = createAnalysistimeColorScale(vis.graph.aNodes, ["white", "black"]);
        initDoiTimeComponent(vis.graph.aNodes);

        /* Init all nodes filtered. */
        initDoiFilterComponent(vis.graph.aNodes);
        filterAction = "blend";

        /* Draw analysis connecting links. */
        vis.canvas.append("g").classed({"aHLinks": true});
        vis.canvas.append("g").classed({"aLinks": true});
        updateAnalysisLinks(vis.graph);

        drawLayerNodes(vis.graph.layerNodes);

        /* Draw analysis nodes. */
        drawAnalysisNodes(vis.graph.aNodes);

        /* Draw subanalysis nodes. */
        drawSubanalysisNodes();

        /* Draw nodes. */
        drawNodes();

        /* Concat aNode, saNode and node. */
        domNodeset = concatDomClassElements(["aNode", "saNode", "node"]);

        /* Add dragging behavior to nodes. */
        applyDragBehavior();

        /* Draw support view. */
        drawSupportView(vis);

        /* Initiate doi. */
        updateNodeFilter();
        updateLinkFilter();
        updateNodeDoi();

        /* Event listeners. */
        handleEvents(vis.graph);

        /* Set initial graph position. */
        fitGraphToWindow(0);

        /* TODO: Experimental layer highlighting. */
        var layerColorScale = d3.scale.category20();
        layer.each(function (ln) {
            ln.children.values().forEach(function (an) {
                d3.select("#gNodeId-" + an.autoId).style({"stroke": layerColorScale(ln.id)});
                d3.select("#nodeId-" + an.autoId).style({"stroke": layerColorScale(ln.id)});
                an.children.values().forEach(function (san) {
                    d3.select("#nodeId-" + san.autoId).style({"stroke": layerColorScale(ln.id)});
                    san.children.values().forEach(function (n) {
                        d3.select("#nodeId-" + n.autoId).style({"stroke": layerColorScale(ln.id)});
                    });
                });
            });
        });
    };


    /* TODO: On facet filter reset button, reset filter as well. */
    /**
     * Update filtered nodes.
     */
    var updateNodeFilter = function () {
        /* Hide or blend (un)selected nodes. */
        analysis.each(function (an) {
            var self = d3.select(this);
            if (!an.filtered) {

                /* Blend/Hide analysis. */
                self.classed("filteredNode", false)
                    .classed("blendedNode", function () {
                        return filterAction === "blend" ? true : false;
                    });

                /* Update child nodes. */
                an.children.values().forEach(function (san) {
                    d3.select("#gNodeId-" + san.autoId)
                        .classed("filteredNode", false)
                        .classed("blendedNode", function () {
                            return filterAction === "blend" ? true : false;
                        });

                    san.children.values().forEach(function (n) {
                        d3.select("#gNodeId-" + n.autoId)
                            .classed("filteredNode", false)
                            .classed("blendedNode", function () {
                                return filterAction === "blend" ? true : false;
                            });
                    });
                });

            } else {

                /* Update child nodes. */
                an.children.values().forEach(function (san) {
                    d3.select("#gNodeId-" + san.autoId)
                        .classed("filteredNode", true)
                        .classed("blendedNode", false);
                    san.children.values().forEach(function (n) {
                        d3.select("#gNodeId-" + n.autoId)
                            .classed("filteredNode", true)
                            .classed("blendedNode", false);
                    });
                });

                /* Display analysis. */
                self.classed("filteredNode", true).classed("blendedNode", false);
            }
        });
    };

    /**
     * Update filtered links.
     */
    var updateLinkFilter = function () {
        vis.graph.aLinks.forEach(function (al) {

        });
    };

    /**
     * On attribute filter change, the provenance visualization will be updated.
     * @param vis The provenance visualization root object.
     * @param solrResponse Query response object holding information about attribute filter changed.
     */
    var runRenderUpdatePrivate = function (vis, solrResponse) {
        var selNodes = [];

        if (solrResponse instanceof SolrResponse) {

            vis.graph.aNodes = aNodesBAK;
            vis.graph.saNodes = saNodesBAK;
            vis.graph.nodes = nodesBAK;
            vis.graph.aLinks = aLinksBAK;

            /* Copy filtered nodes. */
            solrResponse.getDocumentList().forEach(function (d) {
                selNodes.push(vis.graph.nodeMap.get(d.uuid));
            });

            /* Update subanalysis and workflow filter attributes. */
            vis.graph.nodes.forEach(function (n) {
                if (selNodes.map(function (d) {
                        return d.parent;
                    }).indexOf(n.parent) === -1) {
                    n.parent.children.values().forEach(function (cn) {
                        cn.filtered = false;
                    });
                    n.parent.filtered = false;
                    n.parent.links.values().forEach(function (l) {
                        l.filtered = false;
                    });
                } else {
                    n.parent.children.values().forEach(function (cn) {
                        cn.filtered = true;
                    });
                    n.parent.filtered = true;
                    n.parent.links.values().forEach(function (l) {
                        l.filtered = true;
                    });
                }

                /* Filtered attribute changed. */
                n.parent.children.values().forEach(function (cn) {
                    cn.doi.filteredChanged();
                });
                n.parent.doi.filteredChanged();
            });

            /* Update analysis filter attributes. */
            vis.graph.aNodes.forEach(function (an) {
                if (an.children.values().some(function (san) {
                        return san.filtered;
                    })) {
                    an.filtered = true;
                } else {
                    an.filtered = false;
                }
                an.doi.filteredChanged();
            });

            /* Update analysis link filter attributes. */
            vis.graph.aLinks.forEach(function (al) {
                al.filtered = false;
            });
            vis.graph.aLinks.filter(function (al) {
                return al.source.parent.parent.filtered && al.target.parent.parent.filtered;
            }).forEach(function (al) {
                al.filtered = true;
            });

            /* On filter action 'hide', splice and recompute graph. */
            if (filterAction === "hide") {

                /* Update filtered nodesets. */
                vis.graph.aNodes = vis.graph.aNodes.filter(function (an) {
                    return an.filtered;
                });
                vis.graph.saNodes = vis.graph.saNodes.filter(function (san) {
                    return san.filtered;
                });
                vis.graph.nodes = vis.graph.nodes.filter(function (n) {
                    return n.filtered;
                });

                /* Update filtered linksets. */
                vis.graph.aLinks = vis.graph.aLinks.filter(function (al) {
                    return al.filtered;
                });
            }

            updateNodeDoi();

            dagreDynamicLayout(vis.graph);
            fitGraphToWindow(nodeLinkTransitionTime);

            updateNodeFilter();
            updateAnalysisLinks(vis.graph);

            vis.graph.aNodes.forEach(function (an) {
                updateLink(an, an.x, an.y);
            });
        }
        lastSolrResponse = solrResponse;
    };

    /**
     * Publish module function.
     */
    return {
        run: function (vis) {
            runRenderPrivate(vis);
        }, update: function (vis, solrResponse) {
            runRenderUpdatePrivate(vis, solrResponse);
        }
    };
}();