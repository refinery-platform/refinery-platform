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

    var saBBoxes = d3.map(),
        saBBox = Object.create(null);

    var timeColorScale = Object.create(null);
    var filterAction = Object.create(null);

    var lastSolrResponse = Object.create(null);

    /* Simple tooltips by NG. */
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "refinery-tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");


    /**
     * On doi change, update node doi labels.
     */
    var updateNodeDoi = function () {
        /* Update node doi label. */
        d3.selectAll(".node, .saNode, .aNode").select(".nodeDoiLabel").text(function (d) {
            return d.doi.doiWeightedSum;
        });

        /* Glyph scale. */
        d3.selectAll(".node, .saNode, .aNode").each(function (d) {

            /* Doi-dependant node glyph scaling factor. */
            var scaleFactor = 1;

            switch (true) {
                case (-2 < d.doi.doiWeightedSum && d.doi.doiWeightedSum <= 0.25):
                    scaleFactor = 0.75;
                    break;
                case (0.25 < d.doi.doiWeightedSum && d.doi.doiWeightedSum <= 0.5):
                    scaleFactor = 1.0;
                    break;
                case (0.5 < d.doi.doiWeightedSum && d.doi.doiWeightedSum <= 0.75):
                    scaleFactor = 1.25;
                    break;
                case (0.75 < d.doi.doiWeightedSum && d.doi.doiWeightedSum <= 2):
                    scaleFactor = 1.5;
                    break;
            }

            /* Update node glyph size. */
            if (d.nodeType !== "subanalysis" && d.nodeType !== "analysis") {
                if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                    d3.select("#nodeId-" + d.autoId).select("circle")
                        .transition()
                        .duration(500)
                        .attr("r", function (d) {
                            return d.nodeType === "intermediate" ? 3 * scaleFactor * vis.radius / 4 : scaleFactor * vis.radius;
                        });
                } else if (d.nodeType === "special") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .transition()
                        .duration(500)
                        .attr("transform", "translate(" + (-3 * scaleFactor * vis.radius / 4) + "," + (-3 * scaleFactor * vis.radius / 4) + ")")
                        .attr("width", 6 * scaleFactor * vis.radius / 4)
                        .attr("height", 6 * scaleFactor * vis.radius / 4);
                } else if (d.nodeType === "dt") {
                    d3.select("#nodeId-" + d.autoId)
                        .select("rect")
                        .transition()
                        .duration(500)
                        .attr("transform", function () {
                            return "translate(" + (-scaleFactor * vis.radius / 2) + "," + (-scaleFactor * vis.radius / 2) + ")" +
                                "rotate(45 " + (scaleFactor * vis.radius / 2) + "," + (scaleFactor * vis.radius / 2) + ")";
                        })
                        .attr("width", scaleFactor * vis.radius)
                        .attr("height", scaleFactor * vis.radius);
                }
            } else if (d.nodeType === "subanalysis") {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .transition()
                    .duration(500)
                    .attr("points", function () {
                        return "0," + (-scaleFactor * vis.radius) + " " +
                            (scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2) + " " +
                            (scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            "0" + "," + (scaleFactor * vis.radius) + " " +
                            (-scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            (-scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2);
                    });
            } else if (d.nodeType === "analysis") {
                d3.select("#nodeId-" + d.autoId).select("polygon")
                    .transition()
                    .duration(500)
                    .attr("points", function () {
                        return (-1.5 * scaleFactor * vis.radius) + "," + "0" + " " +
                            (-scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius) + " " +
                            (scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius) + " " +
                            (1.5 * scaleFactor * vis.radius) + "," + "0" + " " +
                            (scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius) + " " +
                            (-scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius);
                    });
            }
        });

        /* Hide or blend (un)selected nodes. */
        vis.graph.saNodes.forEach(function (san) {

            if (!san.filtered) {
                switch (filterAction) {
                    case "hide":
                        d3.select("#nodeId-" + san.autoId).classed("blendedNode", false);
                        san.children.values().forEach(function (n) {
                            d3.select("#nodeId-" + n.autoId).classed("blendedNode", false);
                        });
                        san.links.values().forEach(function (l) {
                            d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", false);
                        });
                        break;
                    case "blend":
                        d3.select("#nodeId-" + san.autoId).classed("blendedNode", true);
                        san.children.values().forEach(function (n) {
                            d3.select("#nodeId-" + n.autoId).classed("blendedNode", true);
                        });
                        san.links.values().forEach(function (l) {
                            d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", true);
                        });
                        break;
                }
                san.children.values().forEach(function (n) {
                    d3.select("#nodeId-" + n.autoId).classed("filteredNode", false);
                });
                san.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("filteredLink", false);
                });
            } else {
                d3.select("#nodeId-" + san.autoId).classed("filteredNode", true);
                d3.select("#nodeId-" + san.autoId).classed("blendedNode", false);
                san.children.values().forEach(function (n) {
                    d3.select("#nodeId-" + n.autoId).classed("filteredNode", true);
                    d3.select("#nodeId-" + n.autoId).classed("blendedNode", false);
                });
                san.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("filteredLink", true);
                    d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", false);
                });
            }
        });

        vis.graph.aNodes.forEach(function (an) {
            if (!an.filtered) {
                switch (filterAction) {
                    case "hide":
                        d3.select("#nodeId-" + an.autoId).classed("blendedNode", false);
                        an.links.values().forEach(function (l) {
                            d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", false);
                        });
                        break;
                    case "blend":
                        d3.select("#nodeId-" + an.autoId).classed("blendedNode", true);
                        an.links.values().forEach(function (l) {
                            d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", true);
                        });
                        break;
                }
                d3.select("#nodeId-" + an.autoId).classed("filteredNode", false);
            } else {
                d3.select("#nodeId-" + an.autoId).classed("filteredNode", true);
                d3.select("#nodeId-" + an.autoId).classed("blendedNode", false);
                an.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("filteredLink", true);
                    d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", false);
                });
            }
        });


        /* TODO: BUG: Executed everytime, although aNode is already expanded. */

        /* On analysis doi. */
        d3.selectAll(".aNode").each(function (an) {
            var keyStroke;

            /* Expand. */
            if (an.doi.doiWeightedSum >= (1 / 3)) {
                keyStroke = {ctrl: true, shift: false};
                /* Collapse. */
            } else if (an.doi.doiWeightedSum < (1 / 3)) {
                keyStroke = {ctrl: false, shift: true};
            } else {
                keyStroke = {ctrl: false, shift: false};
            }
            handleCollapseExpandNode(an, keyStroke);
        });

        /* On subanalysis doi. */
        d3.selectAll(".saNode").each(function (san) {
            var keyStroke;

            /* Expand. */
            if (san.doi.doiWeightedSum >= (2 / 3)) {
                keyStroke = {ctrl: true, shift: false};
                /* Collapse. */
            } else if (san.doi.doiWeightedSum < (1 / 3)) {
                keyStroke = {ctrl: false, shift: true};
            } else {
                keyStroke = {ctrl: false, shift: false};
            }
            handleCollapseExpandNode(san, keyStroke);
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
     * Show subanalysis arc menu.
     * @param n Current dom node.
     */
    var showArcMenu = function (n) {
        n.select(".saMenu").style("display", "inline");
    };

    /**
     * Hide subanalysis arc menu.
     * @param n Current dom node.
     */
    var hideArcMenu = function (n) {
        n.select(".saMenu").style("display", "none");
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
                if ($("#prov-ctrl-links-list-bezier").find("input").is(":checked")) {
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
                if ($("#prov-ctrl-links-list-bezier").find("input").is(":checked")) {
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

        /* While dragging, hide tooltips and arcMenu. */
        hideTooltip();
        if (n.nodeType === "subanalysis") {
            hideArcMenu(d3.select(this));
        }

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

        /* On drag end, show arc menu. */
        if (n.nodeType === "subanalysis") {
            showArcMenu(d3.select(this));
        }

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
        /* d3.selectAll(".node, .aNode, .saNode").call(drag); */
        d3.selectAll(".aNode, .saNode").call(drag);
    };

    /**
     * Filter analyses by time gradient support view.
     * @param timeThreshold The point of time where analyses executed before are hidden.
     * @param vis The provenance visualization root object.
     */
    var filterAnalysesByTime = function (timeThreshold, vis) {
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

        updateNodeDoi();
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

        vis.graph.aNodes.forEach(function (an) {
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
     * Dye graph by analyses and its corresponding workflows.
     */
    var dyeWorkflows = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .intermediateNode, .storedNode").style("stroke", function (d) {
            return timeColorScale(parseISOTimeFormat(d.parent.parent.start));
        });
    };

    /**
     * Dye graph by analyses.
     */
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .intermediateNode, .storedNode").style("fill", function (d) {
            return timeColorScale(parseISOTimeFormat(d.parent.parent.start));
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

        d3.selectAll(".node, .aNode, .saNode").each(function (n) {
            n.highlighted = false;
            n.doi.highlightedChanged();
        });

        updateNodeDoi();
    };

    /**
     * Get predecessing nodes for highlighting the path by the current node selection.
     * @param n BaseNode extending constructor function.
     */
    var highlightPredPath = function (n) {
        while (n.hidden) {
            n = n.parent;
        }

        n.highlighted = true;
        n.doi.highlightedChanged();
        n.children.values().forEach(function (cn) {
            cn.highlighted = true;
            cn.doi.highlightedChanged();
            cn.children.values().forEach(function (ccn) {
                ccn.highlighted = true;
                ccn.doi.highlightedChanged();
            });
        });

        /* Get svg link element, and for each predecessor call recursively. */
        n.predLinks.values().forEach(function (l) {
            l.highlighted = true;
            d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
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

        n.highlighted = true;
        n.doi.highlightedChanged();
        n.children.values().forEach(function (cn) {
            cn.highlighted = true;
            cn.doi.highlightedChanged();
            cn.children.values().forEach(function (ccn) {
                ccn.highlighted = true;
                ccn.doi.highlightedChanged();
            });
        });

        /* Get svg link element, and for each successor call recursively. */
        n.succLinks.values().forEach(function (l) {
            l.highlighted = true;
            d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
            highlightSuccPath(l.target);
        });
    };

    /**
     * Draw links.
     * @param links All links within the graph.
     */
    var drawLinks = function (links) {
        link = vis.canvas.append("g").classed("links", true).selectAll(".link")
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
                    var g = d3.select(this).classed("saNode", true)
                        .attr("transform", "translate(" + san.x + "," + san.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + san.autoId;
                        });

                    /* TODO: Menu currently disabled. */
                    /*var saMenuData = [
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
                     .style("opacity", 0.5);*/

                    var nodeGlyph = g.append("g").classed("saGlyph", true)
                        .style("fill", function () {
                            return timeColorScale(parseISOTimeFormat(san.parent.start));
                        });

                    nodeGlyph.append("polygon")
                        .attr("points", function () {
                            return "0," + (-vis.radius) + " " +
                                (vis.radius) + "," + (-vis.radius / 2) + " " +
                                (vis.radius) + "," + (vis.radius / 2) + " " +
                                "0" + "," + (vis.radius) + " " +
                                (-vis.radius) + "," + (vis.radius / 2) + " " +
                                (-vis.radius) + "," + (-vis.radius / 2);
                        });

                    nodeGlyph.append("text")
                        .text(function (d) {
                            return d.doi.doiWeightedSum;
                        }).attr("class", "nodeDoiLabel")
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "central")
                        .style("display", "none");

                    nodeGlyph.append("text")
                        .attr("transform", function () {
                            return "translate(" + (-cell.width / 2) + "," + (cell.height / 2) + ")";
                        })
                        .text(function (d) {
                            var wfName = "dataset";
                            if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                                wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                            }
                            return wfName.substr(0, 20) + "..";
                        }).attr("class", "nodeAttrLabel")
                        .attr("text-anchor", "right")
                        .attr("dominant-baseline", "bottom")
                        .style("display", "inline");

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
                    var nodeGlyph = d3.select(this).classed({"aNode": true})
                        .attr("transform", "translate(" + an.x + "," + an.y + ")")
                        .attr("id", function () {
                            return "nodeId-" + an.autoId;
                        })
                        .classed({"aNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false})
                        .style("fill", function () {
                            return timeColorScale(parseISOTimeFormat(an.start));
                        });
                    nodeGlyph.append("polygon")
                        .attr("points", function () {
                            return "0," + (vis.radius) + " " +
                                (vis.radius) + "," + (-0.5 * vis.radius) + " " +
                                (vis.radius) + "," + (0.5 * vis.radius) + " " +
                                "0" + "," + (0.5 * vis.radius) + " " +
                                (-vis.radius) + "," + (0.5 * vis.radius) + " " +
                                (-vis.radius) + "," + (-0.5 * vis.radius);
                        });
                    nodeGlyph.append("text")
                        .text(function (d) {
                            return d.doi.doiWeightedSum;
                        }).attr("class", "nodeDoiLabel")
                        .attr("text-anchor", "middle")
                        .attr("dominant-baseline", "central")
                        .style("display", "none");

                    nodeGlyph.append("text")
                        .attr("transform", function () {
                            return "translate(" + (-cell.width / 2) + "," + (cell.height / 2) + ")";
                        })
                        .text(function (d) {
                            return parseISOTimeFormat(d.start).toString().substr(0, 21) + "..";
                        }).attr("class", "nodeAttrLabel")
                        .attr("text-anchor", "right")
                        .attr("dominant-baseline", "bottom")
                        .style("display", "inline");
                });
        });

        /* Set node dom element. */
        aNode = d3.selectAll(".aNode");
    };

    /**
     * Draw nodes.
     * @param nodes All nodes within the graph.
     */
    var drawNodes = function (nodes) {
        analysis.each(function () {
            var analysisId = d3.select(this).attr("id");
            var nodeGlyph = d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return n.parent.parent.autoId === +analysisId.replace(/(analysisId-)/g, "");
                }))
                .enter().append("g").attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                })
                .each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                        d3.select(this)
                            .append("circle")
                            .attr("r", function (d) {
                                return d.nodeType === "intermediate" ? 3 * vis.radius / 4 : vis.radius;
                            });
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .append("rect")
                                .attr("transform", "translate(" + ( -3 * vis.radius / 4) + "," + (-3 * vis.radius / 4) + ")")
                                .attr("width", 6 * vis.radius / 4)
                                .attr("height", 6 * vis.radius / 4);
                        } else if (d.nodeType === "dt") {
                            d3.select(this)
                                .append("rect")
                                .attr("transform", function () {
                                    return "translate(" + (-vis.radius / 2) + "," + (-vis.radius / 2) + ")" + "rotate(45 " + (vis.radius / 2) + "," + (vis.radius / 2) + ")";
                                })
                                .attr("width", vis.radius * 1)
                                .attr("height", vis.radius * 1);
                        }
                    }
                }).attr("class", function (d) {
                    return "node " + d.nodeType + "Node";
                })
                .attr("id", function (d) {
                    return "nodeId-" + d.autoId;
                });

            nodeGlyph.append("text")
                .text(function (d) {
                    return d.doi.doiWeightedSum;
                }).attr("class", "nodeDoiLabel")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .style("display", "none");

            nodeGlyph.filter(function (d) {
                return d.nodeType === "stored";
            }).append("text")
                .attr("transform", function () {
                    return "translate(" + (-cell.width / 2) + "," + (cell.height / 2) + ")";
                })
                .text(function (d) {
                    return d.attributes.get("name");
                }).attr("class", "nodeAttrLabel")
                .attr("text-anchor", "right")
                .attr("dominant-baseline", "bottom")
                .style("display", "inline");
        });

        /* Set node dom element. */
        node = d3.selectAll(".node");
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

        /* Expand. */
        if (keyStroke.ctrl && (d.nodeType === "analysis" || d.nodeType === "subanalysis")) {

            /* Set node visibility. */
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", true);
            d.hidden = true;
            d.children.values().forEach(function (cn) {
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", true);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", false);
                /*if (cn instanceof provvisDecl.Subanalysis === true) {
                 d3.select("#nodeId-" + cn.autoId).select(".saMenu").style("display", "none");
                 }*/
                cn.hidden = false;
            });

            /* Set link visibility. */
            if (d.nodeType === "subanalysis") {
                d.links.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                });
            }
            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                    l.hidden = false;
                });
            });

            /* Set saBBox visibility. */
            if (d.nodeType === "subanalysis") {
                d3.select("#saBBoxId-" + d.autoId).style("display", "inline");
            }

            /* Update connections. */
            d.children.values().forEach(function (cn) {
                updateNode(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
                updateLink(d3.select("#nodeId-" + cn.autoId), cn, cn.x, cn.y);
            });

        } else if (keyStroke.shift && d.nodeType !== "analysis") {
            /* Collapse. */

            /* Set node visibility. */
            d.parent.hidden = false;
            d3.select("#nodeId-" + d.parent.autoId).classed("hiddenNode", false);
            hideChildNodes(d.parent);

            /* Set saBBox visibility. */
            if (d.nodeType === "subanalysis") {
                d3.select("#saBBoxId-" + d.autoId).style("display", "none");
            } else {
                d3.select("#saBBoxId-" + d.parent.autoId).style("display", "none");
            }

            /* Set link visibility. */
            d.parent.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
            d.parent.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.selectAll("#hLinkId-" + l.autoId).classed("hiddenLink", false);
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

        updateNodeDoi();
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

        /* Quick fix to exclude scale from text labels. */
        d3.selectAll("text").attr("transform", "scale(" + (+1 / newScale) + ")");
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
     */
    var handleNodeSelection = function (d) {

        /* Update selection. */
        if (d.selected) {
            d.selected = false;
            d3.select("#nodeId-" + d.autoId).classed("selectedNode", false);
            d.doi.selectedChanged();
            if (d.children.values()) {
                d.children.values().forEach(function (cn) {
                    cn.selected = false;
                    d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                    cn.doi.selectedChanged();
                    if (cn.children.values()) {
                        cn.children.values().forEach(function (ccn) {
                            ccn.selected = false;
                            d3.select("#nodeId-" + ccn.autoId).classed("selectedNode", false);
                            ccn.doi.selectedChanged();
                        });
                    }
                });
            }
        } else {
            d.selected = true;
            d3.select("#nodeId-" + d.autoId).classed("selectedNode", true);
            d.doi.selectedChanged();
            if (d.children.values()) {
                d.children.values().forEach(function (cn) {
                    cn.selected = true;
                    d3.select("#nodeId-" + cn.autoId).classed("selectedNode", true);
                    cn.doi.selectedChanged();
                    if (cn.children.values()) {
                        cn.children.values().forEach(function (ccn) {
                            ccn.selected = true;
                            d3.select("#nodeId-" + ccn.autoId).classed("selectedNode", true);
                            ccn.doi.selectedChanged();
                        });
                    }
                });
            }
        }

        updateNodeDoi();
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
                /* TODO: Add tool_state paramters column. */
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
                    title = "<b>" + "Subanalysis: " + "<b>" + "<a href=/workflows/" + selNode.parent.wfUuid + ">" + data.name + "</a>";
                } else {
                    title = "<b>" + "Dataset " + "<b>";
                }
                break;

            case "analysis":
                data = vis.graph.analysisData.get(selNode.uuid);
                if (typeof data !== "undefined") {
                    title = "<b>" + "Analysis: " + "<b>" + "<a href=/workflows/" + data.uuid + ">" + data.name + "</a>";
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
            /*showTooltip(*/
            /*createHTMLKeyValuePair("Node", d.uuid) + "<br>" +*/
            /*
             createHTMLKeyValuePair("Name", d.name) + "<br>" +
             createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
             createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
             createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
             createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
             createHTMLKeyValuePair("Type", d.fileType), event);*/
            d3.select(this).classed("mouseoverNode", true);
        }).on("mousemove", function (d) {
            /*showTooltip(*/
            /*createHTMLKeyValuePair("Node", d.uuid) + "<br>" +*/
            /*
             createHTMLKeyValuePair("Name", d.name) + "<br>" +
             createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
             createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
             createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
             createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
             createHTMLKeyValuePair("Type", d.fileType), event);*/
        }).on("mouseout", function () {
            /*hideTooltip();*/
            d3.select(this).classed("mouseoverNode", false);
        });

        /* Subanalysis tooltips. */
        saNode.select(".saGlyph").on("mouseover", function (d) {
            /* showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
             createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
             "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);*/
            d3.select(this).classed("mouseoverNode", true);
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                }
                return wfName;
            });

            /*d3.select(this.parentNode).select(".saMenu").style("display", "inline");*/
        }).on("mousemove", function (d) {
            /* showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
             createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
             "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);*/

            /*d3.select(this.parentNode).select(".saMenu").style("display", "inline");*/
        }).on("mouseout", function () {
            /*hideTooltip();*/
            d3.select(this).classed("mouseoverNode", false);
            /*d3.select(this.parentNode).select(".saMenu").style("display", "none");*/
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                }
                return wfName.substr(0, 20) + "..";
            });
        });

        /* Analysis tolltips. */
        aNode.on("mouseover", function (d) {
            /*showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
             createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
             createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);*/
            d3.select(this).classed("mouseoverNode", true);
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString();
            });
        }).on("mousemove", function (d) {
            /* showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
             createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
             createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);*/
        }).on("mouseout", function () {
            /*hideTooltip();*/
            d3.select(this).classed("mouseoverNode", false);
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString().substr(0, 21) + "..";
            });
        });

        /* Subanalysis arc menu. */
        /*var curMenu,
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
         });*/

        /* On mouseover subanalysis bounding box. */
        saBBox.on("mouseover", function () {
            d3.select(this).classed("mouseoverBBox", true);
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid).name;
                }
                return wfName;
            });
        }).on("mouseout", function (d) {
            d3.select(this).classed("mouseoverBBox", false);
            d3.select(this).select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid).name;
                }
                return wfName.substr(0, 20) + "..";
            });
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
     * Draws a bounding box around subanalysis and analysis nodes.
     */
    var drawBoundingBoxes = function () {

        /* Create subanalysis bounding box objects. */
        vis.graph.saNodes.forEach(function (san) {
            var minX = d3.min(san.children.values(), function (d) {
                    return d.x - cell.width / 2 + 5;
                }),
                maxX = d3.max(san.children.values(), function (d) {
                    return d.x + cell.width / 2 - 5;
                }),
                minY = d3.min(san.children.values(), function (d) {
                    return d.y - cell.height / 2 + 5;
                }),
                maxY = d3.max(san.children.values(), function (d) {
                    return d.y + cell.height / 2 - 5;
                });

            saBBoxes.set(san.id, {minX: minX, maxX: maxX, minY: minY, maxY: maxY});
        });

        saBBox = vis.canvas.append("g").classed({"saBBoxes": true})
            .selectAll(".saBBox")
            .data(saBBoxes.keys())
            .enter()
            .append("g")
            .attr("class", "saBBox")
            .attr("id", function (d) {
                return "saBBoxId-" + vis.graph.saNodes[d].autoId;
            }).attr("transform", function (d) {
                return "translate(" + (saBBoxes.get(d).minX) + "," + (saBBoxes.get(d).minY) + ")";
            });

        /* Actual bounding box. */
        saBBox.append("rect")
            .attr("width", function (d) {
                return saBBoxes.get(d).maxX - saBBoxes.get(d).minX;
            })
            .attr("height", function (d) {
                return saBBoxes.get(d).maxY - saBBoxes.get(d).minY;
            })
            .attr("rx", cell.width / 3)
            .attr("ry", cell.height / 3);

        /* Workflow name as label. */
        saBBox.append("text")
            .attr("transform", function () {
                return "translate(" + (10) + "," + (-2) + ")";
            }).attr("class", "nodeAttrLabel")
            .text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d].parent.wfUuid).name;
                }
                return wfName.substr(0, 20) + "..";
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
                return timeColorScale(parseISOTimeFormat(d.target.parent.parent.start));
            });
    };

    /**
     * Expand all analsyes into file and tool nodes.
     * @param graph Provenance graph object.
     */
    var showAllFiles = function (graph) {
        /* Set node visibility. */
        graph.saNodes.forEach(function (san) {
            san.hidden = true;
            d3.selectAll("#nodeId-" + san.autoId).classed("hiddenNode", true);
        });

        graph.aNodes.forEach(function (an) {
            an.hidden = true;
            d3.selectAll("#nodeId-" + an.autoId).classed("hiddenNode", true);
        });

        /* Set link visibility. */
        graph.links.forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId).classed("hiddenLink", false);
            l.hidden = false;
        });

        /* Set nodes visible first. */
        graph.nodes.forEach(function (d) {
            d.hidden = false;
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", false);
        });

        /* Set saBBox visibility. */
        saBBox.each(function (d) {
            d3.select(this).style("display", "inline");
        });

        /* Update connections. */
        graph.nodes.forEach(function (d) {
            updateNode(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
            updateLink(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
        });
    };

    /**
     * Collapse all analyses into single subanalysis nodes.
     * @param graph Provenance graph object.
     */
    var showAllSubanalyses = function (graph) {
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
        graph.aNodes.forEach(function (d) {
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", true);
            d.hidden = true;
        });

        graph.saNodes.forEach(function (d) {
            /* Set node visibility. */
            d.hidden = false;
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", false);
            /*d3.select("#nodeId-" + d.autoId).select(".saMenu").style("display", "none");*/
            hideChildNodes(d);

            /* Set link visibility. */
            d.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.selectAll("#linkId-" + l.autoId).classed("hiddenLink", false);
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
     * Collapse all analyses into single analysis nodes.
     * @param graph Provenance graph object.
     */
    var showAllAnalyses = function (graph) {
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
        graph.aNodes.forEach(function (d) {
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", false);
            d.hidden = false;
            hideChildNodes(d);
        });

        /* Update connections. */
        graph.aNodes.forEach(function (d) {
            updateNode(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
            updateLink(d3.select("#nodeId-" + d.autoId), d, d.x, d.y);
        });
    };

    /**
     * Handle interaction controls.
     * @param graph Provenance graph object.
     */
    var handleToolbar = function (graph) {

        /* TODO: Preserve path highlighting. */

        $("#prov-ctrl-analyses-click").click(function () {
            showAllAnalyses(graph);
        });

        $("#prov-ctrl-subanalyses-click").click(function () {
            showAllSubanalyses(graph);
        });

        $("#prov-ctrl-files-click").click(function () {
            showAllFiles(graph);
        });

        /* Switch link styles. */
        $("[id^=prov-ctrl-links-list-]").click(function () {

            $(this).find("input").prop("checked", true);

            var selectedLinkStyle = $(this).find("label").text();
            switch (selectedLinkStyle) {
                case "Bezier":
                    $("#prov-ctrl-links-list-straight").find("input").prop("checked", false);
                    break;
                case "Straight":
                    $("#prov-ctrl-links-list-bezier").find("input").prop("checked", false);
                    break;
            }

            d3.selectAll(".node, .aNode, .saNode").each(function (n) {
                if (!n.hidden) {
                    updateLink(d3.select(this), n, n.x, n.y);
                }
            });
        });

        /* Switch time-dependant color scheme. */
        $("[id^=prov-ctrl-time-enc-list-]").click(function () {

            $(this).find("input").prop("checked", true);

            var selectedColorScheme = $(this).find("label").text();
            switch (selectedColorScheme) {
                case "Blue":
                    timeColorScale.range(["lightblue", "darkblue"]);
                    $("#prov-ctrl-time-enc-list-gs").find("input").prop("checked", false);
                    break;
                case "Grayscale":
                    timeColorScale.range(["white", "black"]);
                    $("#prov-ctrl-time-enc-list-blue").find("input").prop("checked", false);
                    break;
            }

            d3.selectAll(".node").style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.parent.parent.start));
            });
            d3.selectAll(".aNode").style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.start));
            });
            d3.selectAll(".saNode").select(".saGlyph").style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.parent.start));
            });
            d3.selectAll(".hLink").style("stroke", function (d) {
                return timeColorScale(parseISOTimeFormat(d.target.parent.parent.start));
            });
        });

        /* Show and hide grid. */
        $("#prov-ctrl-show-grid").click(function () {
            if (!$("#prov-ctrl-show-grid").find("input").is(":checked")) {
                d3.select(".grid").style("display", "none");
            } else {
                d3.select(".grid").style("display", "inline");
            }
        });

        /* Show and hide doi labels. */
        $("#prov-ctrl-show-doi").click(function () {
            if (!$("#prov-ctrl-show-doi").find("input").is(":checked")) {
                d3.selectAll(".nodeDoiLabel").style("display", "none");
            } else {
                d3.selectAll(".nodeDoiLabel").style("display", "inline");
            }
        });

        /* Show and hide table. */
        $("#prov-ctrl-show-table").click(function () {
            if (!$("#prov-ctrl-show-table").find("input").is(":checked")) {
                d3.select("#provenance-table").style("display", "none");
                $("#provenance-support-view").css({"top": "0px"});
            } else {
                d3.select("#provenance-table").style("display", "block");
                $("#provenance-support-view").css({"top": ($("#provenance-table").height()) + "px"});
            }
        });

        /* Show and hide support view. */
        $("#prov-ctrl-show-support-view").click(function () {
            if (!$("#prov-ctrl-show-support-view").find("input").is(":checked")) {
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

        /* Switch link styles. */
        $("[id^=prov-ctrl-filter-list-]").click(function () {

            $(this).find("input").prop("checked", true);

            var selectedFilterAction = $(this).find("label").text();
            switch (selectedFilterAction) {
                case "Hide":
                    $("#prov-ctrl-filter-list-blend").find("input").prop("checked", false);
                    filterAction = "hide";
                    break;
                case "Blend":
                    $("#prov-ctrl-filter-list-hide").find("input").prop("checked", false);
                    filterAction = "blend";
                    break;
            }
            runRenderUpdatePrivate(vis, lastSolrResponse);
        });

        /* Choose visible node attribute. */
        $("[id^=prov-ctrl-visible-attribute-list-]").click(function () {

            /* Set and get chosen attribute as active. */
            $(this).find("input").prop("checked", true);
            var selAttrName = $(this).find("label").text();

            /* On click, set current to active and unselect others. */
            $("#prov-ctrl-visible-attribute-list > li").each(function (idx, li) {
                var item = $(li);
                if (item[0].id !== ("prov-ctrl-visible-attribute-list-" + selAttrName)) {
                    item.find("input").prop("checked", false);
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

                    updateTableContent(d);
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

        /* Collapse on bounding box click.*/
        saBBox.on("click", function (d) {
            var keyStroke;
            keyStroke = {ctrl: false, shift: true};
            handleCollapseExpandNode(vis.graph.saNodes[d].children.values()[0], keyStroke);

            /* Deselect. */
            vis.graph.saNodes[d].selected = false;
            vis.graph.saNodes[d].doi.selectedChanged();
            vis.graph.saNodes[d].parent.selected = false;
            vis.graph.saNodes[d].parent.doi.selectedChanged();
            vis.graph.saNodes[d].parent.children.values().forEach(function (cn) {
                cn.selected = false;
                cn.doi.selectedChanged();
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                cn.children.values().forEach(function (acn) {
                    acn.selected = false;
                    acn.doi.selectedChanged();
                    d3.select("#nodeId-" + acn.autoId).classed("selectedNode", false);
                });
            });
            d3.select("#nodeId-" + vis.graph.saNodes[d].parent.autoId).classed("selectedNode", false);

            /* Update node doi. */
            updateNodeDoi();
        });
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
     * Main render module function.
     * @param provVis The provenance visualization root object.
     */
    var runRenderPrivate = function (provVis) {
        /* Save vis object to module scope. */
        vis = provVis;
        cell = {width: vis.radius * 5, height: vis.radius * 5};

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.width;
        depth = vis.graph.depth;
        grid = vis.graph.grid;

        /* Short delay. */
        setTimeout(function () {
            timeColorScale = createAnalysistimeColorScale(vis.graph.aNodes, ["white", "black"]);
            initDoiTimeComponent(vis.graph.aNodes);
            filterAction = "hide";

            /* Set coordinates for nodes. */
            assignCellCoords(vis.graph.nodes, vis.graph.width, vis.graph.depth);

            /* Draw grid. */
            drawGrid(vis.graph.grid);

            /* Draw simple background links for highlighting. */
            drawHighlightingShapes(vis.graph.links);

            /* Draw links. */
            drawLinks(vis.graph.links);

            /* Draw bounding boxes. */
            drawBoundingBoxes();

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

            /* Draw support view. */
            drawSupportView(vis);

            /* Initiate doi. */
            updateNodeDoi();

            /* Event listeners. */
            $(function () {
                handleEvents(vis.graph);
            });

            /* Fade in. */
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

    /**
     * On attribute filter change, the provenance visualization will be updated.
     * @param vis The provenance visualization root object.
     * @param solrResponse Query response object holding information about attribute filter changed.
     */
    var runRenderUpdatePrivate = function (vis, solrResponse) {
        var selNodes = [];

        if (solrResponse instanceof SolrResponse) {

            /* Copy filtered nodes. */
            solrResponse.getDocumentList().forEach(function (d) {
                selNodes.push(vis.graph.nodeMap.get(d.uuid));
            });

            /* Set (un)filtered subanalyses. */
            vis.graph.nodes.forEach(function (n) {
                if (selNodes.map(function (d) {
                    return d.parent;
                }).indexOf(n.parent) === -1) {
                    n.parent.children.values().forEach(function (cn) {
                        cn.filtered = false;
                    });
                    n.parent.filtered = false;
                } else {
                    n.parent.children.values().forEach(function (cn) {
                        cn.filtered = true;
                    });
                    n.parent.filtered = true;
                }

                /* Filtered attribute changed. */
                n.parent.children.values().forEach(function (cn) {
                    cn.doi.filteredChanged();
                });
                n.parent.doi.filteredChanged();

            });

            /* Update analysis node filter. */
            vis.graph.aNodes.forEach(function (an) {
                an.filtered = false;
                an.children.values().forEach(function (san) {
                    if (san.filtered) {
                        an.filtered = true;
                    }
                });
                an.doi.filteredChanged();
            });

            updateNodeDoi();
        }
        lastSolrResponse = solrResponse;
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