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

        hLink = Object.create(null),

        saBBox = Object.create(null),
        aBBox = Object.create(null);

    var analysisWorkflowMap = d3.map(),

        width = 0,
        depth = 0,
        grid = [];

    var timeColorScale = Object.create(null);
    var filterAction = Object.create(null);

    var lastSolrResponse = Object.create(null);

    var selectedNodeSet = d3.map();

    var draggingActive = false;

    /* Simple tooltips by NG. */
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "refinery-tooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden");


    /**
     * Helper - Filter dummy analysis nodes.
     * @param an Analysis node.
     */
    var excludeDummyAnalyses = function (an) {
        return an.analysis !== "dummy";
    };

    /**
     * On doi change, update node doi labels.
     */
    var updateNodeDoi = function () {
        /* Update node doi label. */
        domNodeset.select(".nodeDoiLabel").text(function (d) {
            return d.doi.doiWeightedSum;
        });

        /* Glyph scale. */
        domNodeset.each(function (d) {
            var self = d3.select(this);
            /* Doi-dependant node glyph scaling factor. */
            var scaleFactor = 1;

            /*switch (true) {
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
             }*/
            scaleFactor = 0.75;

            /* Update node glyph size. */
            if (d.nodeType !== "subanalysis" && d.nodeType !== "analysis") {
                if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                    self.select("circle")
                        .attr("r", function (d) {
                            return d.nodeType === "intermediate" ? 3 * scaleFactor *
                                vis.radius / 4 : scaleFactor * vis.radius;
                        });
                } else if (d.nodeType === "special") {
                    self.select("rect")
                        .attr("transform", "translate(" + (-3 * scaleFactor * vis.radius / 4) + "," +
                            (-3 * scaleFactor * vis.radius / 4) + ")")
                        .attr("width", 6 * scaleFactor * vis.radius / 4)
                        .attr("height", 6 * scaleFactor * vis.radius / 4);
                } else if (d.nodeType === "dt") {
                    self.select("rect")
                        .attr("transform", function () {
                            return "translate(" + (-scaleFactor * vis.radius / 2) + "," +
                                (-scaleFactor * vis.radius / 2) + ")" +
                                "rotate(45 " + (scaleFactor * vis.radius / 2) + "," +
                                (scaleFactor * vis.radius / 2) + ")";
                        })
                        .attr("width", scaleFactor * vis.radius)
                        .attr("height", scaleFactor * vis.radius);
                }
            } else if (d.nodeType === "subanalysis") {
                self.select("polygon")
                    .attr("points", function () {
                        return "0," + (-scaleFactor * vis.radius) + " " +
                            (scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2) + " " +
                            (scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            "0" + "," + (scaleFactor * vis.radius) + " " +
                            (-scaleFactor * vis.radius) + "," + (scaleFactor * vis.radius / 2) + " " +
                            (-scaleFactor * vis.radius) + "," + (-scaleFactor * vis.radius / 2);
                    });
            } else if (d.nodeType === "analysis") {
                self.select("polygon")
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

        /* TODO: On facet filter reset button, reset filter aswell. */
        /* Hide or blend (un)selected nodes. */
        analysis.each(function (an) {
            var self = d3.select(this);
            if (!an.filtered) {

                /* Blend/Hide analysis links. */
                an.predLinks.values().forEach(function (pl) {
                    d3.selectAll("#linkId-" + pl.autoId + ", #hLinkId-" + pl.autoId).classed("filteredLink", false)
                        .classed("blendedLink", function () {
                            return filterAction === "blend" ? true : false;
                        });
                });
                an.succLinks.values().forEach(function (sl) {
                    d3.selectAll("#linkId-" + sl.autoId + ", #hLinkId-" + sl.autoId).classed("filteredLink", false)
                        .classed("blendedLink", function () {
                            return filterAction === "blend" ? true : false;
                        });
                });

                /* Blend/Hide analysis. */
                self.classed("filteredNode", false)
                    .classed("blendedNode", function () {
                        return filterAction === "blend" ? true : false;
                    });
            } else {
                /* Display analysis links. */
                an.predLinks.values().forEach(function (pl) {
                    if (pl.source.filtered) {
                        d3.selectAll("#linkId-" + pl.autoId + ", #hLinkId-" + pl.autoId).classed("filteredLink", true)
                            .classed("blendedLink", false);
                    }
                });
                an.succLinks.values().forEach(function (sl) {
                    if (sl.target.filtered) {
                        d3.selectAll("#linkId-" + sl.autoId + ", #hLinkId-" + sl.autoId).classed("filteredLink", true)
                            .classed("blendedLink", false);
                    }
                });

                /* Display analysis. */
                self.classed("filteredNode", true).classed("blendedNode", false);
            }
        });

        /* TODO: BUG: Executed everytime, although aNode is already expanded. */
        /* On analysis doi. */
        aNode.each(function (an) {
            if (an.doi.doiWeightedSum >= (1 / 3)) {
                /* Expand. */
                handleCollapseExpandNode(an, "e");
            }
        });

        /* On subanalysis doi. */
        saNode.each(function (san) {
            if (san.doi.doiWeightedSum >= (2 / 3)) {
                /* Expand. */
                handleCollapseExpandNode(san, "e");
            } else if (san.doi.doiWeightedSum < (1 / 3)) {
                /* Collapse. */
                handleCollapseExpandNode(san, "c");

            } else {
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


    var dragStartAnalysisPos = {col: 0, row: 0};

    /**
     * Drag start listener support for nodes.
     * @param n Node object.
     */
    var dragStart = function (n) {
        d3.event.sourceEvent.stopPropagation();

        dragStartAnalysisPos = {col: n.col, row: n.row};
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
        dom.attr("transform", "translate(" + x + "," + y + ")");
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


    /* TODO: Links on expansion are buggy sometimes. */
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
            var deltaCol = 0,
                deltaRow = 0;

            if (d instanceof provvisDecl.Node && d.parent.parent.hidden) {
                deltaCol = d.parent.col;
                deltaRow = d.parent.row;
                if (d.parent.hidden) {
                    deltaCol += d.col;
                    deltaRow += d.row;
                }
            }

            return {x: mX + deltaCol * cell.width, y: mY + deltaRow * cell.height};
        };

        /* Get input links and update coordinates for x2 and y2. */
        n.predLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
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
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
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

        /* Drag selected node. */
        updateNode(self, n, d3.event.x, d3.event.y);

        /* Drag adjacent links. */
        updateLink(n, d3.event.x, d3.event.y);

        /* Update data. */
        n.col = Math.round(d3.event.x / cell.width);
        n.row = Math.round(d3.event.y / cell.height);
        n.x = n.col * cell.width;
        n.y = n.row * cell.height;

        draggingActive = true;
    };

    /**
     *
     * @param n Analysis node.
     * @param dom Analysis node as dom object.
     * @param action Drag or expand action.
     */
    var shiftAnalysisNode = function (n, dom, action) {
        var self = dom;

        /* When a node is dragged to a negative col or row,
         * the graph is shifted by the absolute amount of the negative cell count.
         */
        var shiftCols = 0,
            shiftRows = 0,
            i = 0,
            j = 0;

        if (n.col < 0 || n.row < 0 || n.col >= vis.graph.l.depth || n.row >= vis.graph.l.width) {
            if (n.col < 0 || n.row < 0) {
                shiftCols = n.col < 0 ? Math.abs(n.col) : 0;
                shiftRows = n.row < 0 ? Math.abs(n.row) : 0;

                /* TODO: Revise bug. */
                //if (action === "dragging") {
                /*var deltaTrans = {x: -shiftCols * cell.width, y: -shiftRows * cell.height},
                 oldTransCoords = d3.transform(vis.canvas.attr("transform")),
                 x = oldTransCoords.translate[0],
                 y = oldTransCoords.translate[1],
                 s = oldTransCoords.scale[0];

                 */
                /* Transform vis to the cell out of bound. */
                /*
                 vis.canvas.attr("transform", "translate(" + (x + deltaTrans.x) + "," + (y + deltaTrans.y) + ")scale(" + s + ")");
                 vis.zoom.translate([parseInt(x + deltaTrans.x, 10), parseInt(y + deltaTrans.y, 10)]);
                 vis.zoom.scale(parseFloat(s));*/
                //}

                vis.graph.aNodes.forEach(function (an) {
                    an.col += shiftCols;
                    an.row += shiftRows;
                    an.x = an.col * cell.width;
                    an.y = an.row * cell.height;

                    updateNode(d3.select("#gNodeId-" + an.autoId), an, an.x, an.y);
                    updateLink(an, an.x, an.y);
                });
            } else if (n.col >= vis.graph.l.depth || n.row >= vis.graph.l.width) {
                shiftCols = n.col >= vis.graph.l.depth ? n.col - vis.graph.l.depth + 1 : 0;
                shiftRows = n.row >= vis.graph.l.width ? n.row - vis.graph.l.width + 1 : 0;
            }

            /* Enlarge grid. */

            /* Add columns. */
            for (i = 0; i < shiftCols; i++) {
                vis.graph.l.grid.push([]);
                for (j = 0; j < vis.graph.l.width; j++) {
                    vis.graph.l.grid[vis.graph.l.depth + i][j] = "undefined";
                }
            }

            vis.graph.l.depth += shiftCols;

            /* Add rows. */
            for (i = 0; i < shiftRows; i++) {
                for (j = 0; j < vis.graph.l.depth; j++) {
                    vis.graph.l.grid[j][vis.graph.l.width + i] = "undefined";
                }
            }

            vis.graph.l.width += shiftRows;

            /* Update grid dom. */
            updateGrid(vis.graph);

            for (i = 0; i < vis.graph.l.depth; i++) {
                for (j = 0; j < vis.graph.l.width; j++) {
                    vis.graph.l.grid[i][j] = "undefined";
                }
            }

            /* Update grid cells. */
            vis.graph.aNodes.forEach(function (an) {
                vis.graph.l.grid[an.col][an.row] = an;
            });

            /* Align selected node. */
            updateNode(self, n, n.x, n.y);

            /* Align adjacent links. */
            updateLink(n, n.x, n.y);
        } else {
            /* TODO: May reduce grid to min/max column row cells.*/

            n.x = n.col * cell.width;
            n.y = n.row * cell.height;

            /* Update grid cells. */
            vis.graph.l.grid[dragStartAnalysisPos.col][dragStartAnalysisPos.row] = "undefined";
            vis.graph.l.grid[n.col][n.row] = n;

            /* Align selected node. */
            updateNode(self, n, n.x, n.y);

            /* Align adjacent links. */
            updateLink(n, n.x, n.y);
        }
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function (n) {
        var self = d3.select(this);

        /* Update data. */
        n.col = Math.round(n.x / cell.width);
        n.row = Math.round(n.y / cell.height);

        /* Shift analysis node. */
        shiftAnalysisNode(n, self, "dragging");

        /* Prevent other mouseevents during dragging. */
        setTimeout(function () {
            draggingActive = false;
        }, 200);
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
        var selAnalyses = vis.graph.aNodes.filter(excludeDummyAnalyses).filter(function (an) {
            return parseISOTimeFormat(an.start) >= timeThreshold;
        });

        /* Set (un)filtered analyses. */
        aNode.each(function (an) {
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
        hLink.classed("hiddenLink", true).classed("filteredLink", false);
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
     * Draw links analyses connecting links.
     * @param graph The provenance graph.
     */
    var drawAnalysisLinks = function (graph) {

        /* Draw highlighting links. */
        vis.canvas.append("g").classed({"aHLinks": true}).selectAll(".hLink")
            .data(graph.aLinks.filter(function (l) {
                return !l.l.gap;
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var srcX = (l.source instanceof provvisDecl.Analysis) ? l.source.x : l.source.parent.parent.x,
                    srcY = (l.source instanceof provvisDecl.Analysis) ? l.source.y : l.source.parent.parent.y,
                    tarX = (l.target instanceof provvisDecl.Analysis) ? l.target.x : l.target.parent.parent.x,
                    tarY = (l.target instanceof provvisDecl.Analysis) ? l.target.y : l.target.parent.parent.y;
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, srcX, srcY, tarX, tarY);
                } else {
                    return drawStraightLink(l, srcX, srcY, tarX, tarY);
                }
            })
            .classed({
                "hLink": true, "hiddenLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            });

        /* Draw normal links. */
        vis.canvas.append("g").classed({"aLinks": true}).selectAll(".link")
            .data(graph.aLinks.filter(function (l) {
                return !l.l.gap;
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var srcX = (l.source instanceof provvisDecl.Analysis) ? l.source.x : l.source.parent.parent.x,
                    srcY = (l.source instanceof provvisDecl.Analysis) ? l.source.y : l.source.parent.parent.y,
                    tarX = (l.target instanceof provvisDecl.Analysis) ? l.target.x : l.target.parent.parent.x,
                    tarY = (l.target instanceof provvisDecl.Analysis) ? l.target.y : l.target.parent.parent.y;
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, srcX, srcY, tarX, tarY);
                } else {
                    return drawStraightLink(l, srcX, srcY, tarX, tarY);
                }
            })
            .classed({
                "link": true, "aLink": true
            })
            .attr("id", function (l) {
                return "linkId-" + l.autoId;
            });

        /* Set dom elements. */
        aLink = d3.selectAll(".aLink");
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
     * Draw analysis nodes.
     * @param aNodes Analysis nodes.
     */
    var drawAnalysisNodes = function (aNodes) {
        analysis = vis.canvas.append("g").classed("analyses", true).selectAll(".analysis")
            .data(aNodes)
            .enter().append("g")
            .classed("analysis", function (d) {
                return d.analysis !== "dummy";
            })
            .classed("dummy", function (d) {
                return d.analysis === "dummy";
            })
            .attr("id", function (d) {
                return "gNodeId-" + d.autoId;
            })
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .style("fill", function (d) {
                return timeColorScale(parseISOTimeFormat(d.start));
            });

        analysis.each(function (an) {
            if (an.analysis !== "dummy") {
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
                    .attr("rx", cell.width / 3)
                    .attr("ry", cell.height / 3);

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
                    .attr("rx", cell.width / 3)
                    .attr("ry", cell.height / 3);

                /* Add a clip-path to restrict labels within the cell area. */
                analysisBBox.append("defs")
                    .append("clipPath")
                    .attr("id", "aBBClipId-" + an.autoId)
                    .append("rect")
                    .attr("width", cell.width - 4)
                    .attr("height", cell.height - 2)
                    .attr("rx", cell.width / 3)
                    .attr("ry", cell.height / 3);

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

                aGlyph.append("polygon")
                    .attr("points", function () {
                        return "0," + (vis.radius) + " " +
                            (vis.radius) + "," + (-0.5 * vis.radius) + " " +
                            (vis.radius) + "," + (0.5 * vis.radius) + " " +
                            "0" + "," + (0.5 * vis.radius) + " " +
                            (-vis.radius) + "," + (0.5 * vis.radius) + " " +
                            (-vis.radius) + "," + (-0.5 * vis.radius);
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
            }
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
        d3.select("#gNodeId-" + san.autoId).append("g").classed({"saHLinks": true}).selectAll(".hLink")
            .data(san.links.values())
            .enter().append("path")
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

        /* Draw normal links. */
        d3.select("#gNodeId-" + san.autoId).append("g").classed({"saLinks": true}).selectAll(".link")
            .data(san.links.values())
            .enter().append("path")
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
                var saBBoxCords = getBBoxCords(san, 5);

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
                    .attr("width", saBBoxCords.x.max - saBBoxCords.x.min - 10)
                    .attr("height", cell.height - 10);

                subanalysisBBox.append("rect")
                    .attr("width", function () {
                        return saBBoxCords.x.max - saBBoxCords.x.min;
                    })
                    .attr("height", function () {
                        return saBBoxCords.y.max - saBBoxCords.y.min;
                    })
                    .attr("rx", cell.width / 3)
                    .attr("ry", cell.height / 3);

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

                saGlyph.append("polygon")
                    .attr("points", function () {
                        return "0," + (-vis.radius) + " " +
                            (vis.radius) + "," + (-vis.radius / 2) + " " +
                            (vis.radius) + "," + (vis.radius / 2) + " " +
                            "0" + "," + (vis.radius) + " " +
                            (-vis.radius) + "," + (vis.radius / 2) + " " +
                            (-vis.radius) + "," + (-vis.radius / 2);
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

                if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                    nGlyph
                        .append("circle")
                        .attr("r", function (d) {
                            return d.nodeType === "intermediate" ? 3 * vis.radius / 4 : vis.radius;
                        });
                } else {
                    if (d.nodeType === "special") {
                        nGlyph
                            .append("rect")
                            .attr("transform", "translate(" + ( -3 * vis.radius / 4) + "," +
                                (-3 * vis.radius / 4) + ")")
                            .attr("width", 6 * vis.radius / 4)
                            .attr("height", 6 * vis.radius / 4);
                    } else if (d.nodeType === "dt") {
                        nGlyph
                            .append("rect")
                            .attr("transform", function () {
                                return "translate(" + (-vis.radius / 2) + "," + (-vis.radius / 2) + ")" + "rotate(45 " +
                                    (vis.radius / 2) + "," + (vis.radius / 2) + ")";
                            })
                            .attr("width", vis.radius * 1)
                            .attr("height", vis.radius * 1);
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
     * @param offset Cell grid offset.
     * @returns {{x: {min: *, max: *}, y: {min: *, max: *}}} Min and max x, y coords.
     */
    var getBBoxCords = function (n, offset) {
        var minX, minY, maxX, maxY = 0;

        if (n.children.empty() || (!n.children.empty() && n.children.values()[0].hidden)) {
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
     * @returns {{x: {min: number, max: number}, y: {min: number, max: number}}} Min and max x, y coords.
     */
    var getAnalysisBBoxCoords = function (an) {
        var aMinX = 0, aMaxX = 0, aMinY = 0, aMaxY = 0;

        an.children.values().forEach(function (san) {
            var saBBoxCords = getBBoxCords(san, 1);

            if (san.x + saBBoxCords.x.min < aMinX) {
                aMinX = san.x + saBBoxCords.x.min;
            }
            if (san.y + saBBoxCords.y.min < aMinY) {
                aMinY = san.y + saBBoxCords.y.min;
            }
            if (san.x + saBBoxCords.x.max > aMaxX) {
                aMaxX = san.x + saBBoxCords.x.max;
            }
            if (san.y + saBBoxCords.y.max > aMaxY) {
                aMaxY = san.y + saBBoxCords.y.max;
            }
        });

        return {x: {min: aMinX, max: aMaxX}, y: {min: aMinY, max: aMaxY}};
    };

    /* TODO: On expand, preserve highlighting of inner nodes. */
    /* TODO: In development. */
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
            pos = {col: 0, row: 0},
            i = 0,
            j = 0,
            curAN = Object.create(null);

        /* Expand. */
        if (keyStroke === "e" && (d.nodeType === "analysis" || d.nodeType === "subanalysis")) {





            /* TODO: Prototype implementation for dynamic layout. */
            /* Dynamically adjust layout. */

            if (d.nodeType === "analysis") {
                pos.col = d.col;
                pos.row = d.row;
            } else if (d.nodeType === "subanalysis") {
                pos.col = d.col + d.parent.col;
                pos.row = d.row + d.parent.row;
            }

            /* Heuristics for down, up, left and right expansion. */
            var hLeft = {freeSpace: 1, fullSpace: 1, addCols: 0, colShift: 0},
                hRight = {freeSpace: 1, fullSpace: 1, addCols: 0, colShift: 0},
                hDown = {freeSpace: 1, fullSpace: 1, addRows: 0, rowShift: 0},
                hUp = {freeSpace: 1, fullSpace: 1, addRows: 0, rowShift: 0};

            /* Shift vertically. */
            if (d.nodeType === "analysis") {

                /* Check if grid cells for expanded subanalyses are occupied. */

                /* Check free space downwards, compute rows to shift and rows to add to the grid. */
                i = pos.row + 1;
                while (i < vis.graph.l.width && i < pos.row + d.l.width && vis.graph.l.grid[pos.col][i] === "undefined") {
                    i++;
                    hDown.freeSpace++;
                }
                j = i;
                hDown.fullSpace = hDown.freeSpace;
                while (j < pos.row + d.l.width) {
                    if (j >= vis.graph.l.width || vis.graph.l.grid[pos.col][j] === "undefined") {
                        hDown.fullSpace++;
                    }
                    j++;
                }

                hDown.rowShift = (i === vis.graph.l.width) ? 0 : pos.row + d.l.width - i;
                hDown.addRows = pos.row + d.l.width + vis.graph.l.width - i - vis.graph.l.width;

                /* Check free space upwards, compute rows to shift and rows to add to the grid. */
                i = pos.row - 1;
                while (i >= 0 && i > pos.row - d.l.width && vis.graph.l.grid[pos.col][i] === "undefined") {
                    i--;
                    hUp.freeSpace++;
                }
                j = i;
                hUp.fullSpace = hUp.freeSpace;
                while (j > pos.row - d.l.width) {
                    if (j < 0 || vis.graph.l.grid[pos.col][j] === "undefined") {
                        hUp.fullSpace++;
                    }
                    j--;
                }

                hUp.rowShift = (i === -1) ? 0 : Math.abs(d.l.width - hUp.freeSpace);
                hUp.addRows = (pos.row - d.l.width - i);
                hUp.addRows = (hUp.addRows < 0) ? Math.abs(hUp.addRows) : 0;

                var k = 0,
                    curCell = "undefined";

                /* Expand downwards. */
                if (hDown.fullSpace - hDown.rowShift >= hUp.fullSpace - hUp.rowShift) {

                    /* TODO: Revise. */
                    /* Shift cells below. */
                    if (hDown.rowShift > 0) {
                        for (k = vis.graph.l.width - 1; k >= pos.row + hDown.freeSpace; k--) {
                            curCell = vis.graph.l.grid[pos.col][k];
                            if (curCell !== "undefined") {
                                dragStartAnalysisPos = {col: curCell.col, row: curCell.row};
                                curCell.row = curCell.row + hDown.rowShift;
                                curCell.x = curCell.col * cell.width;
                                curCell.y = curCell.row * cell.height;
                                shiftAnalysisNode(curCell, d3.select("#gNodeId-" + curCell.autoId), "expand");
                            }
                        }
                    }
                }
                /* Expand upwards. */
                else {

                    /* TODO: Revise. */
                    /* Shift cells above. */
                    if (hUp.rowShift > 0) {
                        for (k = 0; k < pos.row - (hUp.freeSpace - 1); k++) {
                            curCell = vis.graph.l.grid[pos.col][k];
                            if (curCell !== "undefined") {
                                dragStartAnalysisPos = {col: curCell.col, row: curCell.row};
                                curCell.row = curCell.row - hUp.rowShift;
                                curCell.x = curCell.col * cell.width;
                                curCell.y = curCell.row * cell.height;
                                shiftAnalysisNode(curCell, d3.select("#gNodeId-" + curCell.autoId), "expand");
                            }
                        }
                    }
                    dragStartAnalysisPos = {col: d.col, row: d.row};
                    d.row = d.row - d.l.width + 1;
                    d.x = d.col * cell.width;
                    d.y = d.row * cell.height;

                    /* Upgrade grid cells. */
                    shiftAnalysisNode(d, d3.select("#gNodeId-" + d.autoId), "expand");
                }


            }
            /* Shift horizontally. */
            else if (d.nodeType === "subanalysis") {

                /* Within the analysis bounding box, shift subanalyses below by workflow grid width. */
                for (i = d.row; i < d.l.width - 1 + d.parent.l.width; i++) {
                    if (i < d.row + d.l.width - 1) {
                        d.parent.l.grid[0].splice(d.row + 1, 0, "undefined");
                    } else if (i > d.row + d.l.width - 1) {
                        var curSA = d.parent.l.grid[0][i];
                        curSA.row = i;
                        curSA.y = curSA.row * cell.height;
                        updateNode(d3.select("#gNodeId-" + curSA.autoId), curSA, curSA.x, curSA.y);

                        /* TODO: Revise. */
                        //updateLink(curSA, curSA.x, curSA.y);
                    }
                }
                d.parent.l.width += d.l.width - 1;

                /* Only shift when no subanalysis is expanded yet. */
                var isAnyChildNodeVisible = d.parent.children.values().some( function (san) {
                    return san.children.values().some( function (n) {
                        return !n.hidden;
                    });
                });

                /* Shift analyses right. */
                if (!isAnyChildNodeVisible) {
                    for (i = vis.graph.l.depth - 1; i > d.parent.col; i--) {
                        for (j = 0; j < vis.graph.l.width; j++) {

                            /* Acutal analyses to shift. */
                            if (vis.graph.l.grid[i][j] && vis.graph.l.grid[i][j] !== "undefined") {
                                curAN = vis.graph.l.grid[i][j];

                                dragStartAnalysisPos = {col: curAN.col, row: curAN.row};
                                curAN.col = curAN.col + d.l.depth-1;
                                curAN.x = curAN.col * cell.width;

                                /*Upgrade grid cells.*/
                                shiftAnalysisNode(curAN, d3.select("#gNodeId-" + curAN.autoId), "expand");
                            }
                        }
                    }
                }

                /* Shift analyses downwards within the same column of the analysis in context. */

                /* Shift analyses. */
                for (i = vis.graph.l.width - 1; i > d.parent.row; i--) {

                    /* Acutal analyses to shift. */
                    if (vis.graph.l.grid[pos.col][i] && vis.graph.l.grid[pos.col][i] !== "undefined") {
                        curAN = vis.graph.l.grid[pos.col][i];

                        dragStartAnalysisPos = {col: curAN.col, row: curAN.row};
                        curAN.row = curAN.row + d.l.width-1;
                        curAN.y = curAN.row * cell.height;

                        /*Upgrade grid cells.*/
                        shiftAnalysisNode(curAN, d3.select("#gNodeId-" + curAN.autoId), "expand");
                    }
                }


            }

            /* Set node visibility. */
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", true);
            d.hidden = true;
            d.children.values().forEach(function (cn) {
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", false);
                cn.hidden = false;

                cn.children.values().forEach(function (n) {
                    d3.select("#nodeId-" + n.autoId).classed("hiddenNode", true);
                    n.hidden = true;
                });
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

                /* Compute bounding box for analysis child nodes. */
                anBBoxCoords = getAnalysisBBoxCoords(d.parent);

                /* Adjust analysis bounding box. */
                d3.selectAll("#BBoxId-" + d.parent.autoId + ", #aBBClipId-" + d.parent.autoId).selectAll("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min;
                    });

                /* Update links. */
                updateLink(d.parent, d.parent.x, d.parent.y);
            } else {

                /* Compute bounding box for analysis child nodes. */
                anBBoxCoords = getBBoxCords(d, 1);

                /* Enlarge analysis bounding box. */
                d3.select("#BBoxId-" + d.autoId).select("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min;
                    });

                /* Update links. */
                updateLink(d, d.x, d.y);
            }

        } else if (keyStroke === "c" && d.nodeType !== "analysis") {
            /* Collapse. */

            /* TODO: Prototype implementation for dynamic layout. */

            /* TODO: Shrink graph grid columns. */
            if (d.nodeType === "subanalysis") {
                pos.col = d.parent.col;
                pos.row = d.parent.row;
            } else {
                pos.col = d.parent.parent.col;
                pos.row = d.parent.parent.row;
            }

            /* Shrink grid by columns. */
            var colIsUsed = function (colIndex) {
                return vis.graph.l.grid[colIndex].some( function (c) {
                    return c !== "undefined";
                });
            };

            /* Check for empty columns and remove them. */
            for (i = pos.col + d.l.depth; i > pos.col && i < vis.graph.l.depth; i--) {
                if (!colIsUsed(i)) {
                    vis.graph.l.grid.splice(i,1);
                }
            }

            vis.graph.l.depth = vis.graph.l.grid.length;

            /* Update analysis cols and rows. */
            for (i = 0; i < vis.graph.l.depth; i++) {
                for (j = 0; j < vis.graph.l.width; j++) {
                    if (vis.graph.l.grid[i][j] !== "undefined") {
                        curAN = vis.graph.l.grid[i][j];
                        curAN.col = i;
                        curAN.row = j;
                        curAN.x = curAN.col * cell.width;
                        curAN.y = curAN.row * cell.height;
                        updateNode(d3.select("#gNodeId-" + curAN.autoId), curAN, curAN.x, curAN.y);
                        updateLink(curAN, curAN.x, curAN.y);
                    }
                }
            }
            updateGrid(vis.graph);


            /* TODO: Shrink grid by rows. */

            /*var getGridRow = function (rowIndex) {
                return vis.graph.l.grid.map( function (c) {
                    return c[rowIndex];
                });
            };

            var rowIsUsed = function (rowIndex) {
                return getGridRow(rowIndex).some( function (c) {
                    return c !== "undefined";
                });
            };

            *//* Check for empty rows and remove them. *//*
            for (i = vis.graph.l.width-1; i >= 0; i--) {
                if (!rowIsUsed(i)) {
                    for (j = 0; j < vis.graph.l.depth; j++) {
                        vis.graph.l.grid[j].splice(i,1);
                    }
                }
            }

            vis.graph.l.width = vis.graph.l.grid[0].length;

            *//* Update analysis cols and rows. *//*
            for (i = 0; i < vis.graph.l.depth; i++) {
                for (j = 0; j < vis.graph.l.width; j++) {
                    if (vis.graph.l.grid[i][j] !== "undefined") {
                        curAN = vis.graph.l.grid[i][j];
                        curAN.col = i;
                        curAN.row = j;
                        curAN.x = curAN.col * cell.width;
                        curAN.y = curAN.row * cell.height;
                        updateNode(d3.select("#gNodeId-" + curAN.autoId), curAN, curAN.x, curAN.y);
                        updateLink(curAN, curAN.x, curAN.y);
                    }
                }
            }
            updateGrid(vis.graph);*/

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

                /* Resize analysis bounding box. */
                d3.selectAll("#BBoxId-" + d.parent.autoId + ", #aBBClipId-" + d.parent.autoId).selectAll("rect")
                    .attr("width", function () {
                        return (d3.select(this.parentElement).attr("id") === "BBoxId-" + d.parent.autoId) ?
                            cell.width - 2 : cell.width - 4;
                    })
                    .attr("height", function () {
                        return cell.height - 2;
                    });

                /* Update links. */
                updateLink(d.parent, d.parent.x, d.parent.y);

            } else {
                /* If the selected subanalysis is the last remaining to collapse, adjust bounding box and clippath. */
                if (!d.parent.parent.children.values().some(function (san) {
                    return san.hidden;
                })) {
                    /* Compute bounding box for analysis child nodes. */
                    anBBoxCoords = getBBoxCords(d.parent.parent, 1);

                    /* Adjust analysis bounding box. */
                    d3.select("#BBoxId-" + d.parent.parent.autoId).select("rect")
                        .attr("width", function () {
                            return anBBoxCoords.x.max - anBBoxCoords.x.min;
                        })
                        .attr("height", function () {
                            return anBBoxCoords.y.max - anBBoxCoords.y.min;
                        });

                    /* Adjust clippath. */
                    d3.select("#aBBClipId-"+d.parent.parent.autoId).select("rect")
                        .attr("width", cell.width - 4)
                        .attr("height", cell.height - 2)
                        .attr("rx", cell.width / 3)
                        .attr("ry", cell.height / 3);
                }
                /* Update links. */
                updateLink(d.parent.parent, d.parent.parent.x, d.parent.parent.y);
            }
        }

        clearNodeSelection();
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
        //updateNodeDoi();
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

        vis.canvas
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");

        vis.zoom.translate(newPos);
        vis.zoom.scale(newScale);

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
     * @param nodes All nodes within the graph.
     */
    var handleFitGraphToWindow = function (nodes) {
        fitGraphToWindow(1000, nodes);
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
            showTooltip(
                    createHTMLKeyValuePair("Name", d.name) + "<br>" +
                    createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
                    createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
                    createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
                    createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
                    createHTMLKeyValuePair("Type", d.fileType), event);

            self.classed("mouseoverNode", true);
        }).on("mousemove", function (d) {
            showTooltip(
                    createHTMLKeyValuePair("Name", d.name) + "<br>" +
                    createHTMLKeyValuePair("Author", d.attributes.get("Author")) + "<br>" +
                    createHTMLKeyValuePair("File Type", d.attributes.get("FileType")) + "<br>" +
                    createHTMLKeyValuePair("Year", d.attributes.get("Year")) + "<br>" +
                    createHTMLKeyValuePair("Month", d.attributes.get("Month")) + "<br>" +
                    createHTMLKeyValuePair("Type", d.fileType), event);

        }).on("mouseout", function () {
            hideTooltip();
            d3.select(this).classed("mouseoverNode", false);
        });

        /* Subanalysis tooltips. */
        saNode.on("mouseover", function (d) {
            var self = d3.select(this);
            showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);

            self.classed("mouseoverNode", true);
            self.select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                }
                return wfName;
            });
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("Subanalysis", d.subanalysis) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                "<b>" + "Workflow: " + "<b>" + "<a href=/workflows/" + d.wfUuid + ">Workflow</a>", event);
        }).on("mouseout", function () {
            var self = d3.select(this);
            hideTooltip();

            self.classed("mouseoverNode", false);
            self.select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(vis.graph.saNodes[d.id].parent.wfUuid).name;
                }
                return wfName.substr(0, 20) + "..";
            });
        });

        /* Analysis tolltips. */
        aNode.on("mouseover", function (d) {
            var self = d3.select(this);
            showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);

            self.classed("mouseoverNode", true);
            self.select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString();
            });
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("Analysis", d.uuid) + "<br>" +
                createHTMLKeyValuePair("Workflow", d.wfUuid) + "<br>" +
                createHTMLKeyValuePair("Created", parseISOTimeFormat(d.start)) + "<br>", event);

        }).on("mouseout", function () {
            var self = d3.select(this);
            hideTooltip();

            self.classed("mouseoverNode", false);
            self.select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString().substr(0, 21) + "..";
            });
        });

        /* On mouseover subanalysis bounding box. */
        saBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(d.parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(d.parent.wfUuid).name;
                }
                return wfName;
            });
        }).on("mouseout", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".nodeAttrLabel").text(function (d) {
                var wfName = "dataset";
                if (typeof vis.graph.workflowData.get(d.parent.wfUuid) !== "undefined") {
                    wfName = vis.graph.workflowData.get(d.parent.wfUuid).name;
                }
                return wfName.substr(0, 20) + "..";
            });
        });

        /* On mouseover analysis bounding box. */
        aBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
            self.select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString();
            });
        }).on("mouseout", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
            self.select(".nodeAttrLabel").text(function (d) {
                return parseISOTimeFormat(d.start).toString().substr(0, 21) + "..";
            });
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
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);

            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
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
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);

            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
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
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);

            self.classed("mouseoverNode", true);
            self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("col", d.col) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("row", d.row) + "<br>" +
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
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
                createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
                createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mouseout", function () {
            hideTooltip();
        });

        aLink.on("mouseover", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
                createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("id", d.id) + "<br>" +
                createHTMLKeyValuePair("src", d.source.autoId) + "<br>" +
                createHTMLKeyValuePair("tar", d.target.autoId), event);
        }).on("mouseout", function () {
            hideTooltip();
        });
    };

    /**
     * Update grid.
     * @param graph The provenance graph.
     */
    var updateGrid = function (graph) {

        /* Data join. */
        var vLine = vis.canvas.select("g.grid")
            .selectAll(".vLine").data(function () {
                return graph.l.grid.map(function (d, i) {
                    return i;
                }).concat([graph.l.depth]);
            });

        /* Enter. */
        vLine.enter().append("line")
            .classed({"vLine": true})
            .attr("id", function (d) {
                return "vLine-" + d;
            });

        /* Enter and update. */
        vLine.attr("x1", function (d, i) {
            return i * cell.width - cell.width / 2;
        }).attr("y1", -cell.height / 2)
            .attr("x2", function (d, i) {
                return i * cell.width - cell.width / 2;
            }).attr("y2", (-cell.height / 2 + graph.l.width * cell.height));

        /* Exit. */
        vLine.exit().remove();

        /* Data join. */
        var hLine = vis.canvas.select("g.grid")
            .selectAll(".hLine")
            .data(function () {
                return graph.l.grid[0].map(function (d, i) {
                    return i;
                }).concat([graph.l.width]);
            });

        /* Enter. */
        hLine.enter().append("line")
            .classed({"hLine": true})
            .attr("id", function (d) {
                return "hLine-" + d;
            });

        /* Enter and update. */
        hLine.attr("x1", -cell.width / 2)
            .attr("y1", function (d, i) {
                return -cell.height / 2 + i * cell.height;
            })
            .attr("x2", -cell.width / 2 + graph.l.depth * cell.width)
            .attr("y2", function (d, i) {
                return -cell.height / 2 + i * cell.height;
            });

        /* Exit. */
        hLine.exit().remove();
    };

    /**
     * Expand all analsyes into file and tool nodes.
     */
    var showAllNodes = function () {
        /* Set node visibility. */
        saNode.each(function (san) {
            san.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        aNode.each(function (an) {
            an.hidden = true;
            d3.select(this).classed("hiddenNode", true);

            /* Compute bounding box for analysis child nodes. */
            var anBBoxCoords = getAnalysisBBoxCoords(an);

            /* Adjust analysis bounding box. */
            d3.select("#BBoxId-" + an.autoId).select("rect")
                .attr("width", function () {
                    return anBBoxCoords.x.max - anBBoxCoords.x.min;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min;
                });
        });

        /* Set link visibility. */
        link.each(function (l) {
            d3.select(this).classed("hiddenLink", false);
            l.hidden = false;
        });

        /* Set nodes visible first. */
        node.each(function (n) {
            n.hidden = false;
            d3.select(this).classed("hiddenNode", false);
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
            /* Compute bounding box for analysis child nodes. */
            var anBBoxCords = getBBoxCords(an, 1);

            /* Enlarge analysis bounding box. */
            d3.select("#BBoxId-" + an.autoId).select("rect")
                .attr("width", function () {
                    return anBBoxCords.x.max - anBBoxCords.x.min;
                })
                .attr("height", function () {
                    return anBBoxCords.y.max - anBBoxCords.y.min;
                });

            /* Update connections. */
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
            /* Resize analysis bounding box. */
            d3.select("#BBoxId-" + an.autoId).select("rect")
                .attr("width", function () {
                    return cell.width - 2;
                })
                .attr("height", function () {
                    return cell.height - 2;
                });

            /* Update connections. */
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
        });

        $("#prov-ctrl-subanalyses-click").click(function () {
            showAllSubanalyses();
        });

        $("#prov-ctrl-files-click").click(function () {
            showAllNodes();
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

            aNode.each(function (an) {
                updateLink(an, an.x, an.y);
                an.children.values().forEach(function (san) {
                    san.links.values().forEach(function (l) {

                        /* Redraw links within subanalysis. */
                        d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).attr("d", function (l) {
                            if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
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

            $(this).find("input").prop("checked", true);

            var selectedColorScheme = $(this).find("label").text();
            switch (selectedColorScheme) {
                case "Blue":
                    timeColorScale.range(["white", "darkblue"]);
                    $("#prov-ctrl-time-enc-list-gs").find("input").prop("checked", false);
                    break;
                case "Grayscale":
                    timeColorScale.range(["white", "black"]);
                    $("#prov-ctrl-time-enc-list-blue").find("input").prop("checked", false);
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

        /* TODO: BUG: On repositioning table and support view. */
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

        /* Switch filter action. */
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
            handleFitGraphToWindow(graph.nodes);
        });

        /* TODO: Currently disabled - rewrite for develop branch. */
        /* Handle tooltips. */
        //handleTooltips();

        handleDebugTooltips();

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

        /* Collapse on bounding box click.*/
        aBBox.on("click", function (d) {
            if (!draggingActive) {
                d.children.values().forEach(function (san) {
                    handleCollapseExpandNode(san.children.values()[0], "c");
                });
                handleCollapseExpandNode(d.children.values()[0], "c");


                /* Deselect. */
                clearNodeSelection();

                /* TODO: Temporarily disabled. */
                /* Update node doi. */
                //updateNodeDoi();
            }
        });

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
     * Set coordinates for columns and rows as well as nodes.
     * @param graph The provenance graph.
     */
    var assignCellCoords = function (graph) {
        graph.aNodes.forEach(function (an) {
            an.x = an.col * cell.width;
            an.y = an.row * cell.height;
        });

        graph.saNodes.forEach(function (san) {
            san.x = san.col * cell.width;
            san.y = san.row * cell.height;
        });

        graph.nodes.forEach(function (n) {
            n.x = n.col * cell.width;
            n.y = n.row * cell.height;
        });
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

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.l.width;
        depth = vis.graph.l.depth;
        grid = vis.graph.l.grid;

        timeColorScale = createAnalysistimeColorScale(vis.graph.aNodes.filter(excludeDummyAnalyses), ["white", "black"]);
        initDoiTimeComponent(vis.graph.aNodes.filter(excludeDummyAnalyses));

        /* Init all nodes filtered. */
        initDoiFilterComponent(vis.graph.aNodes.filter(excludeDummyAnalyses));
        filterAction = "blend";

        /* Set coordinates for nodes. */
        assignCellCoords(vis.graph);

        /* Draw grid. */
        updateGrid(vis.graph);

        /* Draw analyses connecting links. */
        drawAnalysisLinks(vis.graph);

        /* Draw analysis nodes. */
        drawAnalysisNodes(vis.graph.aNodes);

        /* Draw subanalysis nodes. */
        drawSubanalysisNodes();

        /* Draw nodes. */
        drawNodes();

        /* Concat aNode, saNode and node. */
        domNodeset = concatDomClassElements(["aNode", "saNode", "node"]);

        /* Set initial graph position. */
        fitGraphToWindow(0, vis.graph.nodes);

        /* Add dragging behavior to nodes. */
        applyDragBehavior();

        /* Draw support view. */
        drawSupportView(vis);

        /* Initiate doi. */
        updateNodeDoi();

        /* Event listeners. */
        handleEvents(vis.graph);
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
                if (an.uuid === "dummy") {
                    an.filtered = false;
                }
                else if (an.children.values().some(function (san) {
                    return san.filtered;
                })) {
                    an.filtered = true;
                } else {
                    an.filtered = false;
                }
                an.doi.filteredChanged();
            });

            /* Update dummy paths based on start and end node. */
            vis.graph.aNodes.filter(function (dan) {
                return dan.uuid === "dummy";
            }).forEach(function (an) {
                var curAN = an;

                /* Start node of dummy path. */
                if (curAN.preds.values()[0].uuid !== "dummy" && curAN.preds.values()[0].filtered) {
                    while (curAN.succs.values()[0].uuid === "dummy") {
                        curAN = curAN.succs.values()[0];
                    }

                    /* End node of dummy path. If both start and end node are filtered, set path as filtered. */
                    if (curAN.succs.values()[0].uuid !== "dummy" && curAN.succs.values()[0].filtered) {
                        while (!curAN.preds.values()[0].filtered) {
                            curAN.filtered = true;
                            curAN = curAN.preds.values()[0];
                        }
                        curAN.filtered = true;
                    }
                }
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