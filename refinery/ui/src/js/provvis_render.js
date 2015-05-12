/**
 * Module for render.
 */

var provvisRender = function () {

    var vis = Object.create(null),
        cell = Object.create(null);

    /* Initialize dom elements. */
    var lNode = Object.create(null),
        aNode = Object.create(null),
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
        lLink = Object.create(null),

        saBBox = Object.create(null),
        aBBox = Object.create(null),
        lBBox = Object.create(null);

    var analysisWorkflowMap = d3.map(),

        width = 0,
        depth = 0;

    var timeColorScale = Object.create(null);
    var filterAction = Object.create(null);
    var timeLineGradientScale = Object.create(null);

    var lastSolrResponse = Object.create(null);

    var selectedNodeSet = d3.map();

    var draggingActive = false;

    var nodeLinkTransitionTime = 500;

    var aNodesBAK = [],
        saNodesBAK = [],
        nodesBAK = [],
        aLinksBAK = [],
        lLinksBAK = d3.map(),
        lNodesBAK = d3.map();

    var scaleFactor = 0.75;

    var layoutCols = d3.map();

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

        /* On layer doi. */
        lNode.each(function (ln) {
            if (ln.doi.doiWeightedSum >= (1 / 6) && !ln.hidden && ln.filtered) {

                /* TODO: on manual expand, check whether any child nodes are already expanded as aggregated nodes. */

                /* Expand. */
                handleCollapseExpandNode(ln, "e");
                //console.log("expand ln " + ln.autoId);
            }
        });

        /* On analysis doi. */
        aNode.each(function (an) {
            if (an.doi.doiWeightedSum >= (2 / 6) && !an.hidden  && an.filtered) {
                /* Expand. */
                handleCollapseExpandNode(an, "e");
                //console.log("expand an " + an.autoId);
            } else if (an.doi.doiWeightedSum <= (2 / 6) && !an.hidden && an.parent.children.size() > 1 && an.filtered) {
                /* Collapse. */

                handleCollapseExpandNode(an, "c");
                //console.log("colapse an " + an.autoId);

                /* Only collapse those analysis nodes into the layered node which are below the threshold. */
                an.parent.children.values().forEach(function (d) {
                    if (d.doi.doiWeightedSum > (2 / 6)) {
                        d.exaggerated = true;

                        d.hidden = false;
                        d3.select("#nodeId-" + d.autoId).classed("hiddenNode", false);
                        //d3.select("#BBoxId-"+ d.autoId).classed("hiddenBBox", false);
                        updateLink(d);
                    } else {
                        d.exaggerated = false;
                        d.hidden = true;
                        d3.select("#nodeId-" + an.autoId).classed("hiddenNode", true);
                    }
                });
            }
        });

        /* On subanalysis doi. */
        saNode.each(function (san) {
            if (san.doi.doiWeightedSum >= (4 / 6) && !san.hidden && san.filtered) {
                /* Expand. */
                handleCollapseExpandNode(san, "e");
            } else if (san.doi.doiWeightedSum < (2 / 6) && !san.parent.hidden && san.filtered) {
                /* Collapse. */
                handleCollapseExpandNode(san, "c");
            } else if (!san.parent.hidden && san.filtered) {
                /* Stay in subanalysis view. */
                //handleCollapseExpandNode(san.children.values()[0], "c");
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
        tooltip.style("top", (event.pageY + 10) + "px");
        tooltip.style("left", (event.pageX + 10) + "px");
    };

    /**
     * Hide tooltip.
     */
    var hideTooltip = function () {
        tooltip.style("visibility", "hidden");
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

        if (curN instanceof provvisDecl.Layer) {
            x += curN.x;
            y += curN.y;
        } else {
            while (!(curN instanceof provvisDecl.Layer) && !(curN instanceof provvisDecl.ProvGraph)) {
                x += curN.x;
                y += curN.y;
                curN = curN.parent;
            }
        }

        return {x: x, y: y};
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
    var drawBezierLink1 = function (l, srcX, srcY, tarX, tarY) {
        var pathSegment = "M" + (srcX) + "," + srcY;

        if (tarX - srcX > vis.cell.width * 1.5) {

            /* Extend links in expanded columns. */
            var curN = l.source,
                hLineSrc = srcX;

            if (l.source instanceof provvisDecl.Layer || l.target instanceof provvisDecl.Layer || l.source.parent !== l.target.parent) {
                while (!(curN instanceof provvisDecl.Analysis) && !(curN instanceof provvisDecl.Layer)) {
                    curN = curN.parent;
                }

                if (curN instanceof provvisDecl.Analysis && !curN.parent.hidden && l.source.hidden) {
                    curN = curN.parent;
                }
                hLineSrc = getABBoxCoords(curN, 0).x.max - vis.cell.width / 2;

                /* LayoutCols provides the maximum width of any potential expanded node
                 * within the column of the graph. An the width difference is calculated as offset and added as
                 * horizontal line to the link. */
                layoutCols.values().forEach(function (c) {
                    if (c.nodes.indexOf(curN.autoId) !== -1) {
                        var curWidth = getABBoxCoords(curN, 0).x.max - getABBoxCoords(curN, 0).x.min,
                            offset = (c.width - curWidth)/2 + vis.cell.width/2;
                        if (curWidth < c.width) {
                            hLineSrc = srcX + offset;
                        }
                    }
                });

                pathSegment = pathSegment.concat(" H" + (hLineSrc));
            }

            pathSegment = pathSegment.concat(" C" + (hLineSrc + cell.width / 3) + "," + (srcY) + " " +
                (hLineSrc + cell.width / 2 - cell.width / 3) + "," + (tarY) + " " +
                (hLineSrc + cell.width / 2) + "," + (tarY) + " " +
                " H" + (tarX));
        } else {
            pathSegment = pathSegment.concat(" C" + (srcX + cell.width) + "," + (srcY) + " " +
                (tarX - cell.width) + "," + (tarY) + " " +
                (tarX) + "," + (tarY) + " ");
        }

        return pathSegment;
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
    var drawBezierLink2 = function (l, srcX, srcY, tarX, tarY) {
        var pathSegment = "M" + srcX + "," + srcY;

        if (tarX - srcX > 5 * scaleFactor * vis.radius) {
            pathSegment = pathSegment.concat(" H" + (tarX - cell.width) + " Q" + ((tarX - cell.width) + cell.width / 3) + "," + (srcY) + " " +
                ((tarX - cell.width) + cell.width / 2) + "," + (srcY + (tarY - srcY) / 2) + " " +
                "T" + (tarX) + "," + tarY);
        } else {
            pathSegment = pathSegment.concat(" C" + (srcX + cell.width) + "," + (srcY) + " " +
                (tarX - cell.width) + "," + (tarY) + " " +
                (tarX) + "," + (tarY) + " ");
        }

        return pathSegment;
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
    var drawBezierLink3 = function (l, srcX, srcY, tarX, tarY) {
        var pathSegment = "M" + srcX + "," + srcY;

        pathSegment = pathSegment.concat(" C" + (srcX + cell.width) + "," + (srcY) + " " +
            (tarX - cell.width) + "," + (tarY) + " " +
            (tarX) + "," + (tarY) + " ");

        return pathSegment;
    };

    /* TODO: May use functions as parameters. */
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
        return drawBezierLink1(l, srcX, srcY, tarX, tarY);
        //return drawBezierLink2(l, srcX, srcY, tarX, tarY);
        //return drawBezierLink3(l, srcX, srcY, tarX, tarY);
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
        pathSegment = pathSegment.concat(" L" + tarX + "," + tarY);
        return pathSegment;
    };

    /**
     * Update link through translation while dragging or on dragend.
     * @param n Node object element.
     */
    var updateLink = function (n) {
        var predLinks = d3.map(),
            succLinks = d3.map();

        /* Get layer and/or analysis links. */
        switch (n.nodeType) {
            case "layer":
                n.predLinks.values().forEach(function (pl) {
                    predLinks.set(pl.autoId, pl);
                });
                n.succLinks.values().forEach(function (sl) {
                    succLinks.set(sl.autoId, sl);
                });
                n.children.values().forEach(function (an) {
                    an.predLinks.values().forEach(function (pl) {
                        predLinks.set(pl.autoId, pl);
                    });
                    an.succLinks.values().forEach(function (sl) {
                        succLinks.set(sl.autoId, sl);
                    });
                });
                break;
            case "analysis":
                n.predLinks.values().forEach(function (pl) {
                    predLinks.set(pl.autoId, pl);
                });
                n.succLinks.values().forEach(function (sl) {
                    succLinks.set(sl.autoId, sl);
                });
                break;
        }

        /* Get input links and update coordinates for x2 and y2. */
        predLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId)
                .transition()
                .duration(draggingActive ? 0 : nodeLinkTransitionTime)
                .attr("d", function (l) {

                    var srcCoords = getVisibleNodeCoords(l.source),
                        tarCoords = getVisibleNodeCoords(l.target);

                    if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    } else {
                        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    }
                });
        });

        /* Get output links and update coordinates for x1 and y1. */
        succLinks.values().forEach(function (l) {
            d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId)
                .transition()
                .duration(draggingActive ? 0 : nodeLinkTransitionTime)
                .attr("d", function (l) {

                    var tarCoords = getVisibleNodeCoords(l.target),
                        srcCoords = getVisibleNodeCoords(l.source);

                    if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                        return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    } else {
                        return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
                    }
                });
        });
    };

    /**
     * Drag start listener support for nodes.
     */
    var dragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    /**
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {
        var self = d3.select(this);

        /* While dragging, hide tooltips. */
        hideTooltip();

        var deltaY = d3.event.y - n.y;

        /* Set coords. */
        n.x = d3.event.x;
        n.y = d3.event.y;

        /* Drag selected node. */
        updateNode(self, n, d3.event.x, d3.event.y);

        /* Drag adjacent links. */
        updateLink(n);

        if (n instanceof provvisDecl.Layer) {
            n.children.values().forEach(function (an) {
                an.x = n.x - (getABBoxCoords(an, 0).x.max - getABBoxCoords(an, 0).x.min) / 2 + vis.cell.width / 2;
                an.y += deltaY;
                updateNode(d3.select("#gNodeId-" + an.autoId), an, an.x, an.y);
                updateLink(an);
            });
        }

        draggingActive = true;
    };

    /**
     * Update node and link.
     * @param n Node.
     * @param dom Node as dom object.
     */
    var updateNodeAndLink = function (n, dom) {
        var self = dom;

        /* Align selected node. */
        updateNode(self, n, n.x, n.y);

        /* Align adjacent links. */
        updateLink(n);

        if (n instanceof provvisDecl.Layer) {
            n.children.values().forEach(function (an) {
                updateNode(d3.select("#gNodeId-" + an.autoId), an, an.x, an.y);
                updateLink(an);
            });
        }
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function (n) {
        if (draggingActive) {
            var self = d3.select(this);

            /* Update node and adjacent links. */
            updateNodeAndLink(n, self);

            /* Prevent other mouseevents during dragging. */
            setTimeout(function () {
                draggingActive = false;
            }, 200);
        }
    };

    /**
     * Sets the drag events for nodes.
     * @param nodeType The dom nodeset to allow dragging.
     */
    var applyDragBehavior = function (domDragSet) {
        /* Drag and drop node enabled. */
        var drag = d3.behavior.drag()
            .origin(function (d) {
                return d;
            })
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        domDragSet.call(drag);
    };

    /* TODO: Update to incorporate facet filtering and adjust link visibility on loose graphs. */
    /**
     * Filter analyses by time gradient timeline view.
     * @param lowerTimeThreshold The point of time where analyses executed before are hidden.
     * @param upperTimeThreshold The point of time where analyses executed after are hidden.
     * @param vis The provenance visualization root object.
     */
    var filterAnalysesByTime = function (lowerTimeThreshold, upperTimeThreshold, vis) {
        vis.graph.lNodes = lNodesBAK;
        vis.graph.aNodes = aNodesBAK;
        vis.graph.saNodes = saNodesBAK;
        vis.graph.nodes = nodesBAK;
        vis.graph.aLinks = aLinksBAK;
        vis.graph.lLinks = lLinksBAK;

        var selAnalyses = vis.graph.aNodes.filter(function (an) {
            upperTimeThreshold.setSeconds(upperTimeThreshold.getSeconds() + 1);
            return parseISOTimeFormat(an.start) >= lowerTimeThreshold && parseISOTimeFormat(an.start) <= upperTimeThreshold;
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

        /* Update layer filter attributes. */
        vis.graph.lNodes.values().forEach(function (ln) {
            if (ln.children.values().some(function (an) {
                return an.filtered;
            })) {
                ln.filtered = true;
            } else {
                ln.filtered = false;
            }
            ln.doi.filteredChanged();
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
        vis.graph.lLinks.values().forEach(function (ll) {
            ll.filtered = false;
        });
        vis.graph.lLinks.values().filter(function (ll) {
            return ll.source.filtered && ll.target.filtered;
        }).forEach(function (ll) {
            ll.filtered = true;
        });

        /* On filter action 'hide', splice and recompute graph. */
        if (filterAction === "hide") {

            /* Update filtered nodesets. */
            var cpyLNodes = d3.map();
            vis.graph.lNodes.entries().forEach(function (ln) {
                if (ln.value.filtered) {
                    cpyLNodes.set(ln.key, ln.value);
                }
            });
            vis.graph.lNodes = cpyLNodes;
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

            /* Update layer links. */
            var cpyLLinks = d3.map();
            vis.graph.lLinks.entries().forEach(function (ll) {
                if (ll.value.filtered) {
                    cpyLLinks.set(ll.key, ll.value);
                }
            });
            vis.graph.lLinks = cpyLLinks;
        }

        dagreDynamicLayerLayout(vis.graph);
        fitGraphToWindow(nodeLinkTransitionTime);

        updateNodeFilter();
        updateLinkFilter();
        updateAnalysisLinks(vis.graph);
        updateLayerLinks(vis.graph.lLinks);

        vis.graph.aNodes.forEach(function (an) {
            updateLink(an);
        });
        vis.graph.lNodes.values().forEach(function (ln) {
            updateLink(ln);
        });

        updateNodeDoi();
    };

    /**
     * Draws the timeline view.
     * @param vis The provenance visualization root object.
     */
    var drawTimelineView = function (vis) {
        var svg = d3.select("#provenance-timeline-view").select("svg").append("g").append("g").attr("transform", function () {
            return "translate(5,0)";
        });

        var x = d3.scale.linear()
            .domain([0, 300])
            .range([0, 300]);

        /**
         * Drag start listener support for time lines.
         */
        var dragLineStart = function (l) {
            d3.event.sourceEvent.stopPropagation();
        };

        /**
         * Get lower and upper date threshold date in timeline view.
         * @param l Time line.
         * @returns {*[]} An array of size 2 containing both the lower and upper threshold date.
         */
        var getTimeLineThresholds = function (l) {
            var lowerTimeThreshold = Object.create(null),
                upperTimeThreshold = Object.create(null);

            if (l.className === "startTimeline") {
                lowerTimeThreshold = new Date(timeLineGradientScale(l.x));
                upperTimeThreshold = new Date(timeLineGradientScale(
                    x.invert(d3.transform(d3.select(".endTimeline").attr("transform")).translate[0])));
            } else {
                lowerTimeThreshold = new Date(timeLineGradientScale(
                    x.invert(d3.transform(d3.select(".startTimeline").attr("transform")).translate[0])));
                upperTimeThreshold = new Date(timeLineGradientScale(l.x));
            }

            return [lowerTimeThreshold, upperTimeThreshold];
        };

        /**
         * Update lower and upper date threshold label in timeline view.
         * @param l Time line.
         */
        var updateTimelineLabels = function (l) {

            var tlThreshold = getTimeLineThresholds(l);
            tlThreshold[1].setSeconds(tlThreshold[1].getSeconds() + 1);

            var labelStart = d3.time.format.iso(tlThreshold[0]),
                labelEnd = d3.time.format.iso(tlThreshold[1]);
            labelStart = createCustomTimeFormat(labelStart.substr(0, labelStart.length - 1));
            labelEnd = createCustomTimeFormat(labelEnd.substr(0, labelEnd.length - 1));

            d3.select("#tlThreshold").html("Start: " + labelStart + "<br>" +
                "End: " + labelEnd);

            d3.selectAll(".tlAnalysis").each(function (an) {
                if (parseISOTimeFormat(an.start) < tlThreshold[0] || parseISOTimeFormat(an.start) > tlThreshold[1]) {
                    d3.select(this).classed("blendedTLAnalysis", true);
                } else {
                    d3.select(this).classed("blendedTLAnalysis", false);
                }
            });
        };

        /**
         * Drag listener.
         * @param l Time line.
         */
        var draggingLine = function (l) {

            /* Check borders. */
            if (d3.event.x < 0) {
                l.x = 0;
            } else if (d3.event.x > 300) {
                l.x = 300;
            } else {
                l.x = d3.event.x;
            }

            /* Update lines. */
            d3.select(this).attr("transform", function (d) {
                return "translate(" + x(l.x) + ",0)";
            });

            /* Update labels. */
            updateTimelineLabels(l);

            /* On hover filter update. */
            /*var tlTickCoords = vis.graph.aNodes.map(function (an) {return timeLineGradientScale.invert(parseISOTimeFormat(an.start));});
             if (l.className === "startTimeline") {
             if (tlTickCoords.some(function (x) {return l.x - x > 0 && l.x - x < 1; })) {
             filterAnalysesByTime(getTimeLineThresholds(l)[0], getTimeLineThresholds(l)[1], vis);
             }
             } else {
             if (tlTickCoords.some(function (x) {return l.x - x < 0 && l.x - x > -1; })) {
             filterAnalysesByTime(getTimeLineThresholds(l)[0], getTimeLineThresholds(l)[1], vis);
             }
             }*/
        };

        /**
         * Drag end listener.
         * @param l Time line.
         */
        var dragLineEnd = function (l) {

            /* Update labels. */
            updateTimelineLabels(l);

            /* Filter action. */
            filterAnalysesByTime(getTimeLineThresholds(l)[0], getTimeLineThresholds(l)[1], vis);
        };

        /**
         * Sets the drag events for time lines.
         * @param nodeType The dom lineset to allow dragging.
         */
        var applyTimeLineDragBehavior = function (domDragSet) {
            /* Drag and drop line enabled. */
            var dragLine = d3.behavior.drag()
                .origin(function (d) {
                    return d;
                })
                .on("dragstart", dragLineStart)
                .on("drag", draggingLine)
                .on("dragend", dragLineEnd);

            /* Invoke dragging behavior on nodes. */
            domDragSet.call(dragLine);
        };

        /* Geometric zoom. */
        var redrawTimeline = function () {

            /* Translations. */
            svg.selectAll(".tlAnalysis").attr("x1", function (an) {
                return x(timeLineGradientScale.invert(parseISOTimeFormat(an.start)));
            })
                .attr("x2", function (an) {
                    return x(timeLineGradientScale.invert(parseISOTimeFormat(an.start)));
                });

            svg.selectAll(".startTimeline, .endTimeline").attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + 0 + ")";
            });

            svg.select("#timelineView").attr("x", x(0))
                .attr("width", x(300) - x(0));
        };

        /* Timeline zoom behavior. */
        var timelineZoom = d3.behavior.zoom().x(x).scaleExtent([1, 10]).on("zoom", redrawTimeline);

        timelineZoom(svg);

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
            .attr("id", "timelineView")
            .attr("x", 0)
            .attr("y", 10)
            .attr("width", 300)
            .attr("height", 80)
            .style({"fill": "url(#gradientGrayscale)", "stroke": "white", "stroke-width": "1px"});

        var startTime = {
            className: "startTimeline",
            x: 0
        };
        var endTime = {
            className: "endTimeline",
            x: 300
        };

        var timeLineThreshold = svg.selectAll(".line")
            .data([startTime, endTime])
            .enter().append("g").attr("transform", function (d) {
                return "translate(" + d.x + ",0)";
            }).attr("class", function (d) {
                return d.className;
            });

        timeLineThreshold.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 100);

        timeLineThreshold.append("polygon").classed("timeMarker", true)
            .attr("points", "0,90 5,100 -5,100");
        timeLineThreshold.append("polygon").classed("timeMarker", true)
            .attr("points", "0,10 5,0 -5,0");

        timeLineGradientScale = d3.scale.linear()
            .domain([0, 300])
            .range([Date.parse(timeColorScale.domain()[0]), Date.parse(timeColorScale.domain()[1])]);

        svg.selectAll(".line")
            .data(function () {
                return vis.graph.aNodes;
            })
            .enter().append("line").classed("tlAnalysis", true)
            .attr("x1", function (an) {
                return timeLineGradientScale.invert(parseISOTimeFormat(an.start));
            })
            .attr("y1", function (an) {
                return an.children.size() >= 5 ? 10 : parseInt(90 - 80 / 5 * an.children.size(), 10);
            })
            .attr("x2", function (an) {
                return timeLineGradientScale.invert(parseISOTimeFormat(an.start));
            })
            .attr("y2", 90);

        d3.selectAll(".startTimeline, .endTimeline").on("mouseover", function () {
            d3.select(this).classed("mouseoverTimeline", true);
        });

        $("#prov-timeline-view-reset-time").click(function () {
            filterAnalysesByTime(new Date(timeLineGradientScale(0)), new Date(timeLineGradientScale(300)), vis);
            d3.select(this.parentNode).select(".startTimeline")
                .attr("transform", function (d) {
                    d.x = 0;
                    return "translate(0,0)";
                });
            d3.select(this.parentNode).select(".endTimeline")
                .attr("transform", function (d) {
                    d.x = 300;
                    return "translate(300,0)";
                });
            d3.select("#tlThreshold").html("<br>" + "All" + "" + "<br>");

            svg.select("#timelineView").attr("transform", function () {
                return "translate(5,0)";
            }).attr("x", 5)
                .attr("y", 10)
                .attr("width", 300)
                .attr("height", 80)
                .style({"fill": "url(#gradientGrayscale)", "stroke": "white", "stroke-width": "1px"});

            d3.selectAll(".tlAnalysis")
                .attr("x1", function (an) {
                    return timeLineGradientScale.invert(parseISOTimeFormat(an.start));
                })
                .attr("y1", function (an) {
                    return an.children.size() >= 5 ? 10 : parseInt(90 - 80 / 5 * an.children.size(), 10);
                })
                .attr("x2", function (an) {
                    return timeLineGradientScale.invert(parseISOTimeFormat(an.start));
                })
                .attr("y2", 90);

            svg.select("svg.g.g").attr("transform", "translate(5,0)scale(1)");

            /* TODO: Fix zoom reset. */
            svg.zoom.translate([5, 0]);
            svg.zoom.scale(1);
        });

        applyTimeLineDragBehavior(d3.selectAll(".startTimeline, .endTimeline"));

        updateTimelineLabels(startTime);
    };


    /* TODO: Placeholder code. */
    /**
     * Draws the DOI view.
     */
    var drawDoiView = function () {
        var innerSvg = d3.select("#provenance-doi-view").select("svg").select("g").select("g").attr("transform", function () {
            return "translate(0,0)";
        }).select("g");

        var doiFactors = d3.values(provvisDecl.DoiFactors.factors);
        var color = d3.scale.category10();

        var updateDoiView = function (data) {
            var rectOffset = 0,
                labelOffset = 30,
                labelsStart = (300 - data.length * labelOffset) / 2;

            /* Data join. */
            var dComp = innerSvg.selectAll("g").data(data);

            /* Update. */
            var gDCompUpdate = dComp.attr("id", function (d, i) {

                return "doiCompId-" + i;
            }).classed({"doiComp": true});
            gDCompUpdate.select("rect")
                .classed("doiCompRect", true)
                .attr("x", 0)
                .attr("y", function (d) {
                    rectOffset += d.value * 300;
                    return rectOffset - d.value * 300;
                }).attr("width", 40)
                .attr("height", function (d) {
                    return d.value * 300;
                }).style({"fill": function (d, i) {
                    return color(i);
                }});
            rectOffset = 0;
            gDCompUpdate.select("path").classed("doiCompHandle", true).attr("d", function (d, i) {
                rectOffset += d.value * 300;
                var numMaskedComps = d3.values(provvisDecl.DoiFactors.factors).filter(function (dc, i) {
                    return provvisDecl.DoiFactors.isMasked(dc.label);
                }).length;
                if (numMaskedComps > 0) {
                    return "M40," + (rectOffset - d.value * 300) + " " +
                        "L" + (40 + labelOffset) + "," + (labelsStart + i * labelOffset) + " " +
                        "h" + labelOffset + " " +
                        "v" + labelOffset + " " +
                        "h" + (-labelOffset) + " " +
                        "L" + (40) + "," + (rectOffset) + " " +
                        "V" + (rectOffset - d.value * 300);
                } else {
                    return "M40,150 " +
                        "L" + (40 + labelOffset) + "," + (labelsStart + i * labelOffset) + " " +
                        "h" + labelOffset + " " +
                        "v" + labelOffset + " " +
                        "h" + (-labelOffset) + " " +
                        "L" + (40) + ",150";
                }
            }).style({"fill": function (d, i) {
                return color(i);
            }});

            /* Enter. */
            var gDCompEnter = dComp.enter().append("g")
                .attr("id", function (d, i) {
                    return "doiCompId-" + i;
                }).classed({"doiComp": true});
            gDCompEnter.append("rect")
                .classed("doiCompRect", true)
                .attr("x", 0)
                .attr("y", function (d) {
                    rectOffset += d.value * 300;
                    return rectOffset - d.value * 300;
                }).attr("width", 40)
                .attr("height", function (d) {
                    return d.value * 300;
                }).style({"fill": function (d, i) {
                    return color(i);
                }});
            rectOffset = 0;
            gDCompEnter.append("path").classed("doiCompHandle", true).attr("d", function (d, i) {
                rectOffset += d.value * 300;
                return "M40," + (rectOffset - d.value * 300) + " " +
                    "L" + (40 + labelOffset) + "," + (labelsStart + i * labelOffset) + " " +
                    "h" + labelOffset + " " +
                    "v" + labelOffset + " " +
                    "h" + (-labelOffset) + " " +
                    "L" + (40) + "," + (rectOffset) + " " +
                    "V" + (rectOffset - d.value * 300);
            }).style({"fill": function (d, i) {
                return color(i);
            }});

            dComp.exit().remove();

            $("#doiSpinners").css("padding-top", labelsStart);
        };

        updateDoiView(doiFactors);

        doiFactors.forEach(function (dc, i) {
            $('<div/>', {
                "id": "dc-form-" + i,
                "class": "form dc-form",
                "style": "height: 30px; margin-bottom: 0px;"
            }).appendTo("#" + "doiSpinners");

            $('<input/>', {
                "id": "dc-input-" + i,
                "type": "text",
                "class": "form-control dc-input",
                "value": dc.value,
                "style": "width: 25px; margin-bottom: 0px; margin-right: 2px; text-align: right;"
            }).appendTo("#" + "dc-form-" + i);

            $('<div/>', {
                "id": "btn-group-wrapper-" + i,
                "class": "btn-group"
            }).appendTo("#" + "dc-form-" + i);

            $('<div/>', {
                "id": "dc-btn-group-" + i,
                "class": "input-group-btn-vertical",
                "style": "margin-right: 2px;"
            }).appendTo("#" + "btn-group-wrapper-" + i);

            $('<button/>', {
                "id": "dc-carret-up-" + i,
                "class": "btn btn-default",
                "html": "<i class=icon-caret-up></i>"
            }).appendTo("#" + "dc-btn-group-" + i);

            $('<button/>', {
                "id": "dc-carret-down-" + i,
                "class": "btn btn-default",
                "html": "<i class=icon-caret-down></i>"
            }).appendTo("#" + "dc-btn-group-" + i);

            $('<span/>', {
                "id": "dc-label-" + i,
                "class": "label dc-label",
                "html": dc.label,
                "style": "margin-right: 2px; background-color: " + color(i) + ";"
            }).appendTo("#" + "dc-form-" + i);

            $('<input/>', {
                "id": "dc-checkbox-" + i,
                "class": "dc-checkbox",
                "type": "checkbox",
                "checked": "true",
                "style": "margin-top: 0px; margin-right: 2px; vertical-align: middle;"
            }).appendTo("#" + "dc-form-" + i);
        });

        /* TODO: Prototype implementation. */
        /* Ex- and include doi component. */
        $(".dc-checkbox").click(function () {
            var dcId = $(this)[0].id[$(this)[0].id.length - 1],
                val = 0.0;
            if ($(this)[0].checked) {
                $(this.parentNode).find(".dc-label").css("opacity", 1.0);
                d3.select("#doiCompId-" + dcId).style("fill-opacity", 1.0);
                val = 0.0;
                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);
            } else {
                $(this.parentNode).find(".dc-label").css("opacity", 0.3);
                d3.select("#doiCompId-" + dcId).style("fill-opacity", 0.3);
                val = 0.0;
                $("#dc-input-" + dcId).val(val);
                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, false);
            }

            var numMaskedComps = d3.values(provvisDecl.DoiFactors.factors).filter(function (dc, i) {
                return provvisDecl.DoiFactors.isMasked(dc.label);
            }).length;

            if (numMaskedComps > 0) {
                var accVal = d3.values(provvisDecl.DoiFactors.factors)
                    .filter(function (dc, i) {
                        return provvisDecl.DoiFactors.isMasked(dc.label);
                    })
                    .map(function (dc) {
                        return dc.value;
                    })
                    .reduce(function (accVal, cur) {
                        return accVal + cur;
                    });

                var tar = 1.0;

                d3.values(provvisDecl.DoiFactors.factors)
                    .forEach(function (dc, i) {
                        if (provvisDecl.DoiFactors.isMasked(dc.label)) {
                            var isMasked = $("#dc-checkbox-" + i)[0].checked;
                            if (accVal === 0) {
                                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], 1, isMasked);
                                $("#dc-input-" + i).val(1);
                            } else {
                                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], (dc.value / accVal) * tar, isMasked);
                                $("#dc-input-" + i).val((dc.value / accVal) * tar);
                            }
                        }
                    });
            }
            updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
        });

        /* TODO: Clean up code duplication. */

        /* Increase component's influence. */
        $(".dc-form .btn:first-of-type").on('click', function () {
            var dcId = $(this)[0].id[$(this)[0].id.length - 1];
            var val = parseFloat($("#dc-input-" + dcId).val()) + 0.01;
            if ($("#dc-checkbox-" + dcId)[0].checked && val <= 1) {
                $("#dc-input-" + dcId).val(val);
                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

                var accVal = d3.values(provvisDecl.DoiFactors.factors)
                    .filter(function (dc, i) {
                        return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
                    })
                    .map(function (dc) {
                        return dc.value;
                    })
                    .reduce(function (accVal, cur) {
                        return accVal + cur;
                    });

                var tar = parseFloat(1 - val);

                d3.values(provvisDecl.DoiFactors.factors)
                    .forEach(function (dc, i) {
                        if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
                            var isMasked = $("#dc-checkbox-" + i)[0].checked;
                            provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], (dc.value / accVal) * tar, isMasked);
                            $("#dc-input-" + i).val((dc.value / accVal) * tar);
                        }
                    });
                updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
            }
        });

        /* Decrease component's influence. */
        $(".dc-form .btn:last-of-type").on('click', function () {
            var dcId = $(this)[0].id[$(this)[0].id.length - 1];
            var val = parseFloat($("#dc-input-" + dcId).val()) - 0.01;
            if ($("#dc-checkbox-" + dcId)[0].checked && val >= 0) {
                $("#dc-input-" + dcId).val(val);
                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

                var accVal = d3.values(provvisDecl.DoiFactors.factors)
                    .filter(function (dc, i) {
                        return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
                    })
                    .map(function (dc) {
                        return dc.value;
                    })
                    .reduce(function (accVal, cur) {
                        return accVal + cur;
                    });

                var tar = parseFloat(1 - val);

                d3.values(provvisDecl.DoiFactors.factors)
                    .forEach(function (dc, i) {
                        if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
                            var isMasked = $("#dc-checkbox-" + i)[0].checked;
                            provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], (dc.value / accVal) * tar, isMasked);
                            $("#dc-input-" + i).val((dc.value / accVal) * tar);
                        }
                    });
                updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
            }
        });

        $(".dc-input").keypress(function (e) {
            if (e.which == 13) {
                var dcId = $(this)[0].id[$(this)[0].id.length - 1];
                var val = parseFloat($("#dc-input-" + dcId).val());

                if (val > 1) {
                    val = 1;
                } else if (val < 0) {
                    val = 0;
                }

                $(this).val(val);
                provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[dcId], val, true);

                var accVal = d3.values(provvisDecl.DoiFactors.factors)
                    .filter(function (dc, i) {
                        return i != dcId && provvisDecl.DoiFactors.isMasked(dc.label);
                    })
                    .map(function (dc) {
                        return dc.value;
                    })
                    .reduce(function (accVal, cur) {
                        return accVal + cur;
                    });

                var tar = parseFloat(1 - val);

                d3.values(provvisDecl.DoiFactors.factors)
                    .forEach(function (dc, i) {
                        if (i != dcId && provvisDecl.DoiFactors.isMasked(dc.label)) {
                            var isMasked = $("#dc-checkbox-" + i)[0].checked;
                            provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], (dc.value / accVal) * tar, isMasked);
                            $("#dc-input-" + i).val((dc.value / accVal) * tar);
                        }
                    });
                updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
            }
        });

        $("#prov-doi-view-apply").on('click', function () {
            //updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
            updateNodeDoi();
        });

        $("#prov-doi-view-reset").on('click', function () {
            var val = parseFloat(1 / d3.values(provvisDecl.DoiFactors.factors).filter(function (dc, i) {
                return provvisDecl.DoiFactors.isMasked(dc.label);
            }).length);

            d3.values(provvisDecl.DoiFactors.factors)
                .forEach(function (dc, i) {
                    if (!provvisDecl.DoiFactors.isMasked(dc.label)) {
                        $("#dc-input-" + i).val(0.0);
                        provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], 0.0, false);
                    } else {
                        $("#dc-input-" + i).val(val);
                        provvisDecl.DoiFactors.set(d3.keys(provvisDecl.DoiFactors.factors)[i], val, true);
                    }
            });
            updateDoiView(d3.values(provvisDecl.DoiFactors.factors));
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

        if (n instanceof provvisDecl.Layer) {
            n.children.values().forEach(function (an) {
                an.succLinks.values().forEach(function (l) {
                    l.highlighted = true;
                    if (!l.hidden)
                        d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false).classed("filteredLink", true);

                    highlightSuccPath(l.target);
                });
            });
        } else {
            /* Get svg link element, and for each successor call recursively. */
            n.succLinks.values().forEach(function (l) {
                l.highlighted = true;
                if (!l.hidden)
                    d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false).classed("filteredLink", true);

                highlightSuccPath(l.target);
            });
        }
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
        var strictIsoFormat = d3.time.format("%Y-%m-%dT%H:%M:%S.%L");
        return strictIsoFormat.parse(value);
    };

    /**
     * Parses a string into the ISO time format.
     * @param value The time in iso time format.
     * @returns {*} The time in custom format.
     */
    var createCustomTimeFormat = function (value) {
        var isoDate = parseISOTimeFormat(value),
            customFormat = d3.time.format("%Y-%m-%d %H:%M:%S %p");
        return customFormat(isoDate);
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
     * @param lNodes Layer nodes.
     */
    var updateLayerNodes = function (lNodes) {

        /* Data join. */
        var ln = vis.canvas.select("g.layers").selectAll(".layer")
            .data(lNodes.values());

        /* Enter. */
        var lEnter = ln.enter().append("g")
            .classed({"layer": true});

        lEnter.attr("id", function (d) {
            return "gNodeId-" + d.autoId;
        }).attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        /* Adjust gradient start and stop position as well as steps based on min,
         * max and occurrences of analyses at a specific time. */
        var gradient = lEnter.append("defs")
            .append("linearGradient")
            .attr("id", function (d) {
                return "layerGradientId-" + d.autoId;
            })
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", function (l) {
                var latestDate = d3.min(l.children.values(), function (d) {
                    return d.start;
                });
                return timeColorScale(parseISOTimeFormat(latestDate));
            })
            .attr("stop-opacity", 1);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", function (l) {
                var earliestDate = d3.max(l.children.values(), function (d) {
                    return d.start;
                });
                return timeColorScale(parseISOTimeFormat(earliestDate));
            })
            .attr("stop-opacity", 1);

        /* Draw bounding box. */
        lBBox = lEnter.append("g")
            .attr("id", function (ln) {
                return "BBoxId-" + ln.autoId;
            }).classed({"lBBox": true, "BBox": true, "hiddenBBox": false})
            .attr("transform", function () {
                return "translate(" + (-cell.width / 2) + "," + (-cell.height / 2) + ")";
            });

        lBBox.append("rect")
            .attr("width", function () {
                return cell.width - 1;
            })
            .attr("height", function () {
                return cell.height - 1;
            })
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);


        var layerNode = lEnter.append("g")
            .attr("id", function (l) {
                return "nodeId-" + l.autoId;
            }).classed({"lNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false})
            .classed({
                "hiddenNode": function (an) {
                    return an.hidden;
                }
            });

        lEnter.append("g").classed({"children": true});

        var lGlyph = layerNode.append("g").classed({"glyph": true});
        var lLabels = layerNode.append("g").classed({"labels": true});
        /*.attr("clip-path", function (an) {
         return "url(#bbClipId-" + an.autoId + ")";
         });*/


        /* TODO: Aggregate hidden analysis nodes into a single layer glyph. Glyph dimensions depend on the amount of
         * analysis children the layer has as well as how many analyses of them are hidden. */

        lGlyph.append("defs")
            .append("clipPath")
            .attr("id", function (l) {
                return "bbClipId-" + l.autoId;
            })
            .append("rect")
            .attr("x", -2 * scaleFactor * vis.radius)
            .attr("y", -2 * scaleFactor * vis.radius)
            .attr("rx", 1)
            .attr("ry", 1)
            .attr("width", 4 * scaleFactor * vis.radius)
            .attr("height", 4 * scaleFactor * vis.radius);

        lGlyph.append("g").classed({"glAnchor": true}).append("path")
            .attr("d", function () {
                return "m" + (-2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (-0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 0 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (+0.5 * scaleFactor * vis.radius) + " " + "z";
            }).classed({"llAnchor": true});

        lGlyph.append("g").classed({"grAnchor": true}).append("path")
            .attr("d", function () {
                return "m" + (2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 1 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " + "z";
            }).classed({"rlAnchor": true});

        lGlyph.select("g.glAnchor").append("text")
            .attr("transform", function () {
                return "translate(" + ( -2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.inputs.size();
            }).attr("class", "lLabel");

        lGlyph.select("g.grAnchor").append("text")
            .attr("transform", function () {
                return "translate(" + ( 2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.outputs.size();
            }).attr("class", "lLabel");

        lGlyph.append("rect")
            .attr("x", -2 * scaleFactor * vis.radius)
            .attr("y", -2 * scaleFactor * vis.radius)
            .attr("rx", 1)
            .attr("ry", 1)
            .attr("width", 4 * scaleFactor * vis.radius)
            .attr("height", 4 * scaleFactor * vis.radius).style({
                "fill": function (d) {
                    return "url(#layerGradientId-" + d.autoId + ")";
                }
            }).classed({"lGlyph": true});

        /* TODO: Layer glyph. */
        /*lGlyph.append("line")
         .attr("x1", -1.5 * scaleFactor * vis.radius)
         .attr("y1", -0.5 * scaleFactor * vis.radius)
         .attr("x2", 2 * scaleFactor * vis.radius)
         .attr("y2", -0.5 * scaleFactor * vis.radius)
         .classed({"lLine": true});
         lGlyph.append("line")
         .attr("x1", -2 * scaleFactor * vis.radius)
         .attr("y1", -0.175 * scaleFactor * vis.radius)
         .attr("x2", 2 * scaleFactor * vis.radius)
         .attr("y2", -0.175 * scaleFactor * vis.radius)
         .classed({"lLine": true});
         lGlyph.append("line")
         .attr("x1", -2 * scaleFactor * vis.radius)
         .attr("y1", 0.175 * scaleFactor * vis.radius)
         .attr("x2", 2 * scaleFactor * vis.radius)
         .attr("y2", 0.175 * scaleFactor * vis.radius)
         .classed({"lLine": true});
         lGlyph.append("line")
         .attr("x1", -2 * scaleFactor * vis.radius)
         .attr("y1", 0.5 * scaleFactor * vis.radius)
         .attr("x2", 2 * scaleFactor * vis.radius)
         .attr("y2", 0.5 * scaleFactor * vis.radius)
         .classed({"lLine": true});*/

        /* Add text labels. */
        lLabels.append("text")
            .text(function (d) {
                return d.doi.doiWeightedSum;
            }).attr("class", "nodeDoiLabel")
            .style("display", "none");

        lLabels.append("g")
            .classed({"wfLabel": true})
            .attr("clip-path", function (l) {
                return "url(#bbClipId-" + l.autoId + ")";
            });

        lLabels.append("text")
            .attr("transform", function () {
                return "translate(" + (0) + "," + (-0.9 * scaleFactor * vis.radius) + ")";
            })
            .text(function (d) {
                return d.children.size();
            }).attr("class", "lLabel")
            .style({
                "fill": function (l) {
                    var latestDate = d3.min(l.children.values(), function (d) {
                        return d.start;
                    });
                    return timeColorScale(parseISOTimeFormat(latestDate)) < "#888888" ? "#ffffff" : "#000000";
                }
            })
        ;

        lLabels.select(".wfLabel").append("text")
            .attr("transform", function () {
                return "translate(" + 0 + "," + (scaleFactor * vis.radius) + ")";
            })
            .text(function (d) {
                return d.wfCode;
            }).attr("class", "wfLabel")
            .style({
                "fill": function (l) {
                    var latestDate = d3.min(l.children.values(), function (d) {
                        return d.start;
                    });
                    return timeColorScale(parseISOTimeFormat(latestDate)) < "#888888" ? "#ffffff" : "#000000";
                }
            });

        /* Enter and update. */
        var lUpdate = ln.attr("id", function (d) {
            return "gNodeId-" + d.autoId;
        }).attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

        /* TODO: Implements update parameters. */

        /* Exit. */
        ln.exit().remove();

        /* Set dom elements. */
        layer = vis.canvas.select("g.layers").selectAll(".layer");
        lNode = d3.selectAll(".lNode");
    };

    /**
     * Draw layered nodes.
     * @param lLinks Layer links.
     */
    var updateLayerLinks = function (lLinks) {

        /* Data join. */
        var ln = vis.canvas.select("g.lLinks").selectAll(".link")
            .data(lLinks.values());

        /* Enter. */
        ln.enter().append("path")
            .classed({"link": true, "lLink": true})
            .attr("id", function (d) {
                return "linkId-" + d.autoId;
            }).classed("blendedLink", function (l) {
                return !l.filtered && filterAction === "blend" ? true : false;
            }).classed("filteredLink", function (l) {
                return l.filtered;
            }).classed("hiddenLink", function (l) {
                return l.hidden;
            }).attr("id", function (l) {
                return "linkId-" + l.autoId;
            });

        /* Enter and update. */
        ln.attr("d", function (l) {
            var srcCoords = getVisibleNodeCoords(l.source),
                tarCoords = getVisibleNodeCoords(l.target);

            if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                return drawBezierLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            } else {
                return drawStraightLink(l, srcCoords.x, srcCoords.y, tarCoords.x, tarCoords.y);
            }
        }).classed({"link": true, "lLink": true})
            .attr("id", function (d) {
                return "linkId-" + d.autoId;
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
        ln.exit().remove();

        /* Set dom elements. */
        lLink = vis.canvas.select("g.lLinks").selectAll(".link");
    };

    /**
     * Draw analysis nodes.
     */
    var updateAnalysisNodes = function () {

        /* Data join. */
        var lAnalysis = d3.select("g.analyses").selectAll(".analysis")
            .data(vis.graph.aNodes.sort(function (a, b) {
                return parseISOTimeFormat(a.start) - parseISOTimeFormat(b.start);
            }));

        /* Enter and update. */
        var anUpdate = lAnalysis.attr("id", function (d) {
            return "gNodeId-" + d.autoId;
        });

        anUpdate.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        }).style("fill", function (d) {
            return timeColorScale(parseISOTimeFormat(d.start));
        });

        /* Add a clip-path to restrict labels within the cell area. */
        anUpdate.select("defs")
            .select("clipPath")
            .attr("id", function (an) {
                return "bbClipId-" + an.autoId;
            })
            .select("rect")
            .attr("transform", function () {
                return "translate(" + (-cell.width / 2) + "," + (-cell.height / 2 + 1) + ")";
            })
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", cell.width - 4)
            .attr("height", cell.height - 2/* + 3 * scaleFactor * vis.radius*/)
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Draw bounding box. */
        var analysisBBox = anUpdate.select("g")
            .attr("id", function (an) {
                return "BBoxId-" + an.autoId;
            }).classed({"aBBox": true, "BBox": true, "hiddenBBox": true})
            .attr("transform", function () {
                return "translate(" + (-cell.width / 2 + 1) + "," + (-cell.height / 2 + 1) + ")";
            });

        analysisBBox.select("rect")
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", function () {
                return cell.width - 2;
            })
            .attr("height", function () {
                return cell.height - 2/* + 3 * scaleFactor * vis.radius*/;
            })
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Add a clip-path to restrict labels within the cell area. */
        analysisBBox.select("defs")
            .select("clipPath")
            .attr("id", function (an) {
                return "aBBClipId-" + an.autoId;
            })
            .select("rect")
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", cell.width - 4)
            .attr("height", cell.height - 2/* + 3 * scaleFactor * vis.radius*/)
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Time as label. */
        analysisBBox.select("g").classed({"labels": true})
            .attr("clip-path", function (an) {
                return "url(#aBBClipId-" + an.autoId + ")";
            })
            .select("text")
            .attr("transform", function () {
                return "translate(" + 2 + "," + 0.5 * scaleFactor * vis.radius + ")";
            })
            .attr("class", "aBBoxLabel")
            .text(function (d) {
                return createCustomTimeFormat(d.start);
            });

        /* Draw analysis node. */
        analysisNode = anUpdate.select("g")
            .attr("id", function (an) {
                return "nodeId-" + an.autoId;
            })
            .classed({"aNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false})
            .classed({
                "hiddenNode": function (an) {
                    return an.hidden;
                }
            });

        anUpdate.select("g").classed({"children": true});

        aGlyph = analysisNode.select("g.glyph");
        aLabels = analysisNode.select("g.labels")
            .attr("clip-path", function (an) {
                return "url(#bbClipId-" + an.autoId + ")";
            });

        scaleFactor = 0.75;

        aGlyph.select("g.glAnchor").select("path")
            .attr("d", function () {
                return "m" + (-2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (-0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 0 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (+0.5 * scaleFactor * vis.radius) + " " + "z";
            });

        aGlyph.select("g.grAnchor").select("text")
            .attr("transform", function () {
                return "translate(" + ( -2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.predLinks.size();
            }).attr("class", "aLabel")
            .style("display", "inline");


        aGlyph.select("path")
            .attr("d", function () {
                return "m" + (2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 1 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " + "z";
            }).select("text")
            .attr("transform", function () {
                return "translate(" + ( 2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.succLinks.size();
            }).attr("class", "aLabel")
            .style("display", "inline");

        aGlyph.select("rect")
            .attr("x", -2 * scaleFactor * vis.radius)
            .attr("y", -1.5 * scaleFactor * vis.radius)
            .attr("rx", 1)
            .attr("ry", 1)
            .attr("width", 4 * scaleFactor * vis.radius)
            .attr("height", 3 * scaleFactor * vis.radius);

        /* Add text labels. */
        aLabels.select("text")
            .text(function (d) {
                return d.doi.doiWeightedSum;
            }).attr("class", "nodeDoiLabel")
            .style("display", "none");

        aLabels.select("text")
            .attr("transform", function () {
                return "translate(" + (-1.5 * scaleFactor * vis.radius) + "," + (0.5 * scaleFactor * vis.radius) + ")";
            })
            .text(function (d) {
                return d.wfCode;
            }).attr("class", "wfLabel")
            .style({
                "fill": function (an) {
                    return timeColorScale(parseISOTimeFormat(an.start)) < "#888888" ? "#ffffff" : "#000000";
                }
            }).style("display", "inline");

        /* Enter. */
        var anEnter = lAnalysis.enter().append("g")
            .classed("analysis", true)
            .attr("id", function (d) {
                return "gNodeId-" + d.autoId;
            });

        anEnter.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        }).style("fill", function (d) {
            return timeColorScale(parseISOTimeFormat(d.start));
        });

        /* Add a clip-path to restrict labels within the cell area. */
        anEnter.append("defs")
            .append("clipPath")
            .attr("id", function (an) {
                return "bbClipId-" + an.autoId;
            })
            .append("rect")
            .attr("transform", function () {
                return "translate(" + (-cell.width / 2) + "," + (-cell.height / 2 + 1) + ")";
            })
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", cell.width - 4)
            .attr("height", cell.height - 2 + 2 * scaleFactor * vis.radius)
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Draw bounding box. */
        analysisBBox = anEnter.append("g")
            .attr("id", function (an) {
                return "BBoxId-" + an.autoId;
            }).classed({"aBBox": true, "BBox": true, "hiddenBBox": true})
            .attr("transform", function () {
                return "translate(" + (-cell.width / 2 + 1) + "," + (-cell.height / 2 + 1) + ")";
            });

        analysisBBox.append("rect")
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", function () {
                return cell.width - 2;
            })
            .attr("height", function () {
                return cell.height - 2/* + 3 * scaleFactor * vis.radius*/;
            })
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Add a clip-path to restrict labels within the cell area. */
        analysisBBox.append("defs")
            .append("clipPath")
            .attr("id", function (an) {
                return "aBBClipId-" + an.autoId;
            })
            .append("rect")
            .attr("y", -/*3 * */scaleFactor * vis.radius)
            .attr("width", cell.width - 4)
            .attr("height", cell.height - 2/* + 3 * scaleFactor * vis.radius*/)
            .attr("rx", cell.width / 5)
            .attr("ry", cell.height / 5);

        /* Time as label. */
        analysisBBox.append("g").classed({"labels": true})
            .attr("clip-path", function (an) {
                return "url(#aBBClipId-" + an.autoId + ")";
            })
            .append("text")
            .attr("transform", function () {
                return "translate(" + 2 + "," + 0.5 * scaleFactor * vis.radius + ")";
            })
            .attr("class", "aBBoxLabel")
            .text(function (d) {
                return createCustomTimeFormat(d.start);
            });

        /*analysisBBox.select("g.labels")
         .attr("clip-path", function (an) {
         return "url(#aBBClipId-" + an.autoId + ")";
         }).append("text")
         .attr("transform", function () {
         return "translate(" + 0 + "," + 0 + ")";
         })
         .text(function (d) {
         return d.wfName.toString();
         }).attr("class", "saBBoxLabel");*/

        /* Draw analysis node. */
        var analysisNode = anEnter.append("g")
            .attr("id", function (an) {
                return "nodeId-" + an.autoId;
            })
            .classed({"aNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false})
            .classed({
                "hiddenNode": function (an) {
                    return an.hidden;
                }
            });

        anEnter.append("g").classed({"children": true});

        var aGlyph = analysisNode.append("g").classed({"glyph": true}),
            aLabels = analysisNode.append("g").classed({"labels": true})
                .attr("clip-path", function (an) {
                    return "url(#bbClipId-" + an.autoId + ")";
                });

        aGlyph.append("g").classed({"glAnchor": true}).append("path")
            .attr("d", function () {
                return "m" + (-2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (-0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 0 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (+0.5 * scaleFactor * vis.radius) + " " + "z";
            }).classed({"laAnchor": true});

        aGlyph.select("g.glAnchor").append("text")
            .attr("transform", function () {
                return "translate(" + ( -2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.predLinks.size();
            }).attr("class", "aLabel")
            .style("display", "inline");


        aGlyph.append("g").classed({"grAnchor": true}).append("path")
            .attr("d", function () {
                return "m" + (2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                    "h" + (0.5 * scaleFactor * vis.radius) + " " +
                    "a" + (0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 1 " +
                    "0 " + (1 * scaleFactor * vis.radius) + " " +
                    "h" + (-0.5 * scaleFactor * vis.radius) + " " + "z";
            }).classed({"raAnchor": true});

        aGlyph.select("g.grAnchor").append("text")
            .attr("transform", function () {
                return "translate(" + ( 2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
            })
            .text(function (d) {
                return d.succLinks.size();
            }).attr("class", "aLabel")
            .style("display", "inline");

        aGlyph.append("rect")
            .attr("x", -2 * scaleFactor * vis.radius)
            .attr("y", -1.5 * scaleFactor * vis.radius)
            .attr("rx", 1)
            .attr("ry", 1)
            .attr("width", 4 * scaleFactor * vis.radius)
            .attr("height", 3 * scaleFactor * vis.radius)
            .classed({"aGlyph": true});

        /* Add text labels. */
        aLabels.append("text")
            .text(function (d) {
                return d.doi.doiWeightedSum;
            }).attr("class", "nodeDoiLabel")
            .style("display", "none");

        aLabels.append("text")
            .attr("transform", function () {
                return "translate(" + (0) + "," + (-0.5 * scaleFactor * vis.radius) + ")";
            })
            .text(function (d) {
                return d.children.size();
            }).attr("class", "aLabel")
            .style({
                "fill": function (an) {
                    return timeColorScale(parseISOTimeFormat(an.start)) < "#888888" ? "#ffffff" : "#000000";
                }
            })
            .style("display", "inline");

        aLabels.append("text")
            .attr("transform", function () {
                return "translate(" + 0 + "," + (0.5 * scaleFactor * vis.radius) + ")";
            })
            .text(function (d) {
                return d.wfCode;
            }).attr("class", "wfLabel")
            .style({
                "fill": function (an) {
                    return timeColorScale(parseISOTimeFormat(an.start)) < "#888888" ? "#ffffff" : "#000000";
                }
            })
            .style("display", "inline");

        /* Exit. */
        lAnalysis.exit().remove();

        /* Set dom elements. */
        analysis = vis.canvas.select("g.analyses").selectAll(".analysis");
        aNode = d3.selectAll(".aNode");
        aBBox = d3.selectAll(".aBBox");
    };

    /**
     * Draws the subanalalysis containing links.
     * @param san Subanalysis node.
     */
    var drawSubanalysisLinks = function (san) {

        /* Draw highlighting links. */
        /* Data join. */
        var sahl = d3.select("#gNodeId-" + san.autoId).select("g.saHLinks").selectAll(".hLink")
            .data(san.links.values());

        /* Enter and update. */
        sahl.attr("d",
            function (l) {
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                } else {
                    return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                }
            }).classed({
                "hLink": true, "hiddenLink": true
            }).attr("id", function (l) {
                return "hLinkId-" + l.autoId;
            });

        /* Enter. */
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

        /* Exit. */
        sahl.exit().remove();

        /* Draw normal links. */
        /* Data join. */
        var sal = d3.select("#gNodeId-" + san.autoId).select("g.saLinks").selectAll(".Link")
            .data(san.links.values());

        /* Enter and update. */
        sal.attr("d", function (l) {
            if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
            } else {
                return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
            }
        }).classed({"link": true, "saLink": true, "hiddenLink": true})
            .attr("id", function (l) {
                return "linkId-" + l.autoId;
            });

        /* Enter. */
        sal.enter().append("path")
            .attr("d", function (l) {
                if ($("#prov-ctrl-links-list-bezier").find("input").prop("checked")) {
                    return drawBezierLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                } else {
                    return drawStraightLink(l, l.source.x, l.source.y, l.target.x, l.target.y);
                }
            }).classed({"link": true, "saLink": true, "hiddenLink": true})
            .attr("id", function (l) {
                return "linkId-" + l.autoId;
            });

        /* Exit. */
        sal.exit().remove();
    };

    /**
     * Draw subanalysis nodes.
     * @param saNodes Subanalysis nodes.
     */
    var drawSubanalysisNodes = function () {
        analysis.each(function (an) {

            /* Data join. */
            subanalysis = d3.select(this).select(".children").selectAll(".subanalysis")
                .data(function () {
                    return an.children.values();
                });


            var saEnter = subanalysis.enter().append("g")
                .classed("subanalysis", true)
                .attr("id", function (d) {
                    return "gNodeId-" + d.autoId;
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            saEnter.each(function (san) {
                var self = d3.select(this);
                /* Draw links for each subanalysis. */

                d3.select("#gNodeId-" + san.autoId).append("g").classed({"saHLinks": true});
                d3.select("#gNodeId-" + san.autoId).append("g").classed({"saLinks": true});
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
                        return saBBoxCoords.y.max - saBBoxCoords.y.min - 5;
                    })
                    .attr("rx", cell.width / 5)
                    .attr("ry", cell.height / 5);

                /* Workflow name as label. */
                /*subanalysisBBox.append("g").classed({"labels": true}).attr("clip-path", "url(#saBBClipId-" + san.autoId + ")")
                 .append("text")
                 .attr("transform", function () {
                 return "translate(" + 0 + "," + 0 + ")";
                 }).attr("class", "saBBoxLabel")
                 .text(function () {
                 var wfName = "dataset";
                 if (typeof vis.graph.workflowData.get(san.parent.wfUuid) !== "undefined") {
                 wfName = vis.graph.workflowData.get(san.parent.wfUuid).name;
                 }
                 return wfName.toString();
                 });*/

                /* Draw subanalysis node. */
                var subanalysisNode = self.append("g")
                    .attr("id", function () {
                        return "nodeId-" + san.autoId;
                    }).classed({"saNode": true, "filteredNode": true, "blendedNode": false, "selectedNode": false})
                    .classed({
                        "hiddenNode": function (san) {
                            return san.hidden;
                        }
                    });

                self.append("g").classed({"children": true});

                var saGlyph = subanalysisNode.append("g").classed({"glyph": true}),
                    saLabels = subanalysisNode.append("g").classed({"labels": true})
                        .attr("clip-path", "url(#bbClipId-" + san.autoId + ")");

                saGlyph.append("g").classed({"glAnchor": true}).append("path")
                    .attr("d", function () {
                        return "m" + (-2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                            "h" + (-0.5 * scaleFactor * vis.radius) + " " +
                            "a" + (-0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 0 " +
                            "0 " + (1 * scaleFactor * vis.radius) + " " +
                            "h" + (+0.5 * scaleFactor * vis.radius) + " " + "z";
                    }).classed({"lsaAnchor": true});

                saGlyph.select("g.glAnchor").append("text")
                    .attr("transform", function () {
                        return "translate(" + ( -2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
                    })
                    .text(function (d) {
                        return d.predLinks.size();
                    }).attr("class", "saLabel")
                    .style("display", "inline");

                saGlyph.append("g").classed({"grAnchor": true}).append("path")
                    .attr("d", function () {
                        return "m" + (2 * scaleFactor * vis.radius) + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                            "h" + (0.5 * scaleFactor * vis.radius) + " " +
                            "a" + (0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 1 " +
                            "0 " + (1 * scaleFactor * vis.radius) + " " +
                            "h" + (-0.5 * scaleFactor * vis.radius) + " " + "z";
                    }).classed({"rsaAnchor": true});

                saGlyph.select("g.grAnchor").append("text")
                    .attr("transform", function () {
                        return "translate(" + ( 2.5 * scaleFactor * vis.radius) + "," + 0.5 + ")";
                    })
                    .text(function (d) {
                        return d.succLinks.size();
                    }).attr("class", "saLabel")
                    .style("display", "inline");

                saGlyph.append("rect")
                    .attr("x", -2 * scaleFactor * vis.radius)
                    .attr("y", -1 * scaleFactor * vis.radius)
                    .attr("rx", 1)
                    .attr("ry", 1)
                    .attr("width", 4 * scaleFactor * vis.radius)
                    .attr("height", 2 * scaleFactor * vis.radius);

                /*.attr("x", -1.5 * scaleFactor * vis.radius)
                 .attr("y", -1 * scaleFactor * vis.radius)
                 .attr("rx", 1)
                 .attr("ry", 1)
                 .attr("width", 3 * scaleFactor * vis.radius)
                 .attr("height", 2 * scaleFactor * vis.radius);*/

                /* Add text labels. */
                saLabels.append("text")
                    .text(function (d) {
                        return d.doi.doiWeightedSum;
                    }).attr("class", "nodeDoiLabel")
                    .style("display", "none");

                saLabels.append("text")
                    .attr("transform", function () {
                        return "translate(" + 0 + "," + 0 + ")";
                    })
                    .text(function (d) {
                        return d.parent.wfCode;
                    }).attr("class", "wfLabel")
                    .style({
                        "fill": function (san) {
                            return timeColorScale(parseISOTimeFormat(san.parent.start)) < "#888888" ? "#ffffff" : "#000000";
                        }
                    })
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
                }).classed("blendedNode", function (l) {
                    return !l.filtered && filterAction === "blend" ? true : false;
                }).classed("filteredNode", function (l) {
                    return l.filtered;
                }).classed("hiddenNode", function (l) {
                    return l.hidden;
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

                nGlyph.append("g").classed({"glAnchor": true}).append("path")
                    .attr("d", function () {
                        return "m" + 0 + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                            "h" + (-1 * scaleFactor * vis.radius) + " " +
                            "a" + (-0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 0 " +
                            "0 " + (1 * scaleFactor * vis.radius) + " " +
                            "h" + (+1 * scaleFactor * vis.radius) + " " + "z";
                    }).classed({"lnAnchor": true});

                nGlyph.append("g").classed({"grAnchor": true}).append("path")
                    .attr("d", function () {
                        return "m" + 0 + " " + (-0.5 * scaleFactor * vis.radius) + " " +
                            "h" + (1 * scaleFactor * vis.radius) + " " +
                            "a" + (0.5 * scaleFactor * vis.radius) + " " + (0.5 * scaleFactor * vis.radius) + " 0 0 1 " +
                            "0 " + (1 * scaleFactor * vis.radius) + " " +
                            "h" + (-1 * scaleFactor * vis.radius) + " " + "z";
                    }).classed({"rnAnchor": true});

                if (d.nodeType === "raw" || d.nodeType === "intermediate" || d.nodeType === "stored") {
                    nGlyph
                        .append("circle")
                        .attr("r", function (d) {
                            return d.nodeType === "intermediate" ? 3 * scaleFactor *
                                vis.radius / 4 : 5 * scaleFactor * vis.radius / 6;
                        });
                } else {
                    if (d.nodeType === "special") {
                        nGlyph
                            .append("rect")
                            .attr("transform", "translate(" + (-3 * scaleFactor * vis.radius / 4) + "," +
                                (-3 * scaleFactor * vis.radius / 4) + ")")
                            .attr("width", 1.5 * scaleFactor * vis.radius)
                            .attr("height", 1.5 * scaleFactor * vis.radius);
                    } else if (d.nodeType === "dt") {
                        nGlyph
                            .append("rect")
                            .attr("transform", function () {
                                return "translate(" + (-1.25 * scaleFactor * vis.radius / 2) + "," +
                                    (-1.25 * scaleFactor * vis.radius / 2) + ")" +
                                    "rotate(45 " + (1.25 * scaleFactor * vis.radius / 2) + "," +
                                    (1.25 * scaleFactor * vis.radius / 2) + ")";
                            })
                            .attr("width", 1.25 * scaleFactor * vis.radius)
                            .attr("height", 1.25 * scaleFactor * vis.radius);
                    }
                }

                nLabels.append("text")
                    .text(function (d) {
                        return d.doi.doiWeightedSum;
                    }).attr("class", "nodeDoiLabel")
                    .style("display", "none");

                nLabels.filter(function (d) {
                    return d.nodeType === "stored";
                }).append("text")
                    .attr("transform", function () {
                        return "translate(" + (-cell.width / 2 + 5) + "," + (-vis.radius) + ")";
                    })
                    .text(function (d) {
                        return d.attributes.get("name");
                    }).attr("class", "nodeAttrLabel")
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
                    return !cn.hidden ? an.x + san.x + cn.x : an.x;
                });
            }),
            maxX = !an.hidden ? an.x : d3.max(an.children.values(), function (san) {
                return !san.hidden ? an.x + san.x : d3.max(san.children.values(), function (cn) {
                    return !cn.hidden ? an.x + san.x + cn.x : an.x;
                });
            }),
            minY = !an.hidden ? an.y : d3.min(an.children.values(), function (san) {
                return !san.hidden ? an.y + san.y : d3.min(san.children.values(), function (cn) {
                    return !cn.hidden ? an.y + san.y + cn.y : an.y;
                });
            }),
            maxY = !an.hidden ? an.y : d3.max(an.children.values(), function (san) {
                return !san.hidden ? an.y + san.y : d3.max(san.children.values(), function (cn) {
                    return !cn.hidden ? an.y + san.y + cn.y : an.y;
                });
            });

        return {
            x: {min: minX + offset, max: maxX + cell.width - offset},
            y: {min: minY + offset, max: maxY + cell.height - offset}
        };
    };

    /**
     * Dagre layout including layer nodes.
     * @param graph The provenance graph.
     */
    var dagreLayerLayout = function (graph) {
        var g = new dagre.graphlib.Graph();

        g.setGraph({rankdir: "LR", nodesep: 0, edgesep: 0, ranksep: 0, marginx: 0, marginy: 0});

        g.setDefaultEdgeLabel(function () {
            return {};
        });

        var curWidth = 0,
            curHeight = 0;

        graph.lNodes.values().forEach(function (ln) {
            curWidth = vis.cell.width;
            //curHeight = vis.cell.height;
            curHeight = vis.cell.height;

            g.setNode(ln.autoId, {label: ln.autoId, width: curWidth, height: curHeight});
        });

        graph.lLinks.values().forEach(function (l) {
            g.setEdge(l.source.autoId, l.target.autoId, {
                minlen: 1,
                weight: 1,
                width: 0,
                height: 0,
                labelpos: "r",
                labeloffset: 0
            });
        });

        dagre.layout(g);

        var dlLNodes = d3.entries(g._nodes);
        graph.lNodes.values().forEach(function (ln) {
            curWidth = vis.cell.width;
            curHeight = vis.cell.height;

            ln.x = dlLNodes.filter(function (d) {
                return d.key === ln.autoId.toString();
            })[0].value.x - curWidth / 2;

            ln.y = dlLNodes.filter(function (d) {
                return d.key === ln.autoId.toString();
            })[0].value.y - curHeight / 2;

            updateNodeAndLink(ln, d3.select("#gNodeId-" + ln.autoId));
        });
    };

    /* TODO: Code cleanup. */
    /**
     * Dynamic Dagre layout.
     * @param graph The provenance Graph.
     */
    var dagreDynamicLayerLayout = function (graph) {

        /* Initializations. */
        var g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: "LR",
            nodesep: 1 * scaleFactor * vis.radius,
            edgesep: 0,
            ranksep: 4 * scaleFactor * vis.radius,
            marginx: 0,
            marginy: 0
        });
        g.setDefaultEdgeLabel(function () {
            return {};
        });
        var anBBoxCoords = {},
            curWidth = 0,
            curHeight = 0,
            exNum = 0,
            accY = 0;

        /* Add layer or analysis nodes with a dynamic bounding box size (based on visible child nodes). */
        graph.lNodes.values().forEach(function (ln) {
            d3.select("#BBoxId-" + ln.autoId).classed("hiddenBBox", true);
            if (!ln.hidden) {
                if (ln.filtered) {
                    d3.select("#BBoxId-" + ln.autoId).classed("hiddenBBox", false);
                }
                curWidth = vis.cell.width;
                curHeight = vis.cell.height;

                /* Check exaggerated layer children. */
                /* Add visible dimensions to layer node without bounding boxes. */
                /* Based on current y-coord order, the stack of nodes will be drawn vertically. */
                /* Child nodes inherit x-coord of layer node and y-coord will be computed based on the statement above.*/
                /* Layer node number labels may be updated. */
                /* Maybe add a bounding box for layered node and exaggerated nodes.*/

                exNum = 0;
                accY = ln.y + vis.cell.height;
                ln.children.values().filter(function (an) {return an.filtered || filterAction === "blend";}).sort(function (a, b) {
                    return a.y - b.y;
                }).forEach(function (an) {
                    if (an.exaggerated) {
                        exNum++;
                        an.x = an.parent.x;
                        an.y = accY;
                        accY += (getABBoxCoords(an, 0).y.max - getABBoxCoords(an, 0).y.min);

                        updateNodeAndLink(an, d3.select("#gNodeId-" + an.autoId));
                        d3.select("#BBoxId-" + ln.autoId).classed("hiddenBBox", false);
                        d3.select("#BBoxId-" + an.autoId).classed("hiddenBBox", false);
                    } else {
                        an.x = an.parent.x;
                        an.y = an.parent.y;
                    }
                });

                /* Set layer label and bounding box. */
                var numChildren = ln.children.values().filter(function (an) {return an.filtered || filterAction === "blend";}).length;
                d3.select("#nodeId-" + ln.autoId).select("g.labels").select(".lLabel")
                    .text(function () {
                        return numChildren - exNum + "/" + ln.children.size();
                    });

                /* Get potential expanded bounding box size. */
                var accHeight = curHeight - 2,
                    accWidth = curWidth - 2;
                ln.children.values().filter(function (an) {return an.filtered || filterAction === "blend";}).forEach(function (an) {
                    if (an.exaggerated) {
                        anBBoxCoords = getABBoxCoords(an, 0);
                        if (anBBoxCoords.x.max - anBBoxCoords.x.min - 2 > accWidth) {
                            accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min - 2;
                        }
                        accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
                    }
                });

                d3.select("#BBoxId-" + ln.autoId).attr("transform",
                        "translate(" + (-accWidth / 2) + "," + (-vis.cell.height / 2) + ")")
                    .select("rect")
                    .attr("width", accWidth)
                    .attr("height", accHeight);
                g.setNode(ln.autoId, {label: ln.autoId, width: accWidth, height: accHeight});
            } else {
                ln.children.values().filter(function (an) {return an.filtered || filterAction === "blend";}).forEach(function (an) {
                    anBBoxCoords = getABBoxCoords(an, 0);
                    curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
                    curHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;
                    g.setNode(an.autoId, {label: an.autoId, width: curWidth, height: curHeight});
                });
            }
        });

        /* Add layer-to-layer links. */
        graph.lLinks.values().forEach(function (ll) {
            if (!ll.hidden) {
                g.setEdge(ll.source.autoId, ll.target.autoId, {
                    minlen: 1,
                    weight: 1,
                    width: 0,
                    height: 0,
                    labelpos: "r",
                    labeloffset: 0
                });
            }
        });

        /* Add analysis-mixed links. */
        graph.aLinks.forEach(function (l) {
            if (!l.hidden) {

                /* Either the layer or the analysis is visible and therefore virtual links are created.*/
                var src = l.source.parent.parent.parent.autoId,
                    tar = l.target.parent.parent.parent.autoId;
                if (l.source.parent.parent.parent.hidden) {
                    src = l.source.parent.parent.autoId;
                }
                if (l.target.parent.parent.parent.hidden) {
                    tar = l.target.parent.parent.autoId;
                }

                g.setEdge(src, tar, {
                    minlen: 1,
                    weight: 1,
                    width: 0,
                    height: 0,
                    labelpos: "r",
                    labeloffset: 0
                });
            }
        });

        /* Compute layout. */
        dagre.layout(g);

        /* Set layer and analysis coords. */
        layoutCols = d3.map();
        var accWidth = 0,
            accHeight = 0;

        /* Assign x and y coords for layers or analyses. Check filter action as well as exaggerated nodes. */
        d3.map(g._nodes).values().forEach(function (n) {
            if (typeof n !== "undefined") {
                if (graph.lNodes.has(n.label) && (graph.lNodes.get(n.label).filtered || filterAction === "blend")) {
                    var ln = graph.lNodes.get(n.label);
                    accHeight = vis.cell.height;
                    accWidth = vis.cell.width;

                    ln.children.values().filter(function(an){return an.filtered || filterAction === "blend";}).forEach(function (an) {
                        if (an.exaggerated) {
                            anBBoxCoords = getABBoxCoords(an, 0);
                            if (anBBoxCoords.x.max - anBBoxCoords.x.min > accWidth) {
                                accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
                            }
                            accHeight += anBBoxCoords.y.max - anBBoxCoords.y.min;
                        }
                    });

                    ln.x = n.x - vis.cell.width / 2;
                    ln.y = n.y - accHeight / 2;

                    exNum = 0;
                    accY = ln.y + vis.cell.height;
                    ln.children.values().filter(function(an){return an.filtered || filterAction === "blend";}).sort(function (a, b) {
                        return a.y - b.y;
                    }).forEach(function (an) {
                        anBBoxCoords = getABBoxCoords(an, 0);
                        curWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
                        an.x = ln.x - curWidth / 2 + vis.cell.width / 2;

                        if (an.exaggerated) {
                            an.y = accY;
                            accY += (getABBoxCoords(an, 0).y.max - getABBoxCoords(an, 0).y.min);
                        } else {
                            an.y = an.parent.y;
                        }
                    });
                } else {
                    var an = graph.aNodes.filter(function (an) {
                        return an.autoId === n.label && (an.filtered || filterAction === "blend");
                    })[0];

                    if (an && typeof an !== "undefined") {
                        anBBoxCoords = getABBoxCoords(an, 0);
                        accWidth = anBBoxCoords.x.max - anBBoxCoords.x.min;
                        accHeight = anBBoxCoords.y.max - anBBoxCoords.y.min;

                        an.x = n.x - accWidth / 2;
                        an.y = n.y - accHeight / 2;
                    }
                }

                /* Compute layouted columns. */
                if (layoutCols.has(n.x)) {
                    layoutCols.get(n.x).nodes.push(n.label);
                } else {
                    layoutCols.set(n.x, {nodes: [], width: 0});
                    layoutCols.get(n.x).nodes.push(n.label);
                }
                if (accWidth > layoutCols.get(n.x).width) {
                    layoutCols.get(n.x).width = accWidth;
                }
            }
        });

        /* Update graph dom elements. */
        vis.graph.lNodes.values().forEach(function (ln) {
            updateNodeAndLink(ln, d3.select("#gNodeId-" + ln.autoId));
        });

        /* Reorder node columns by y-coords. */
        layoutCols.values().forEach(function (c) {
            c.nodes = c.nodes.sort(function (a, b) {
                return a.y - b.y;
            });
        });
    };

    /* TODO: Code cleanup. */
    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     * @param d Node.
     * @param keyStroke Keystroke being pressed at mouse click.
     */
    var handleCollapseExpandNode = function (d, keyStroke) {

        /**
         * Helper function.
         * @param n Base node.
         */
        var hideChildNodes = function (n) {
            if (!n.children.empty()) {
                n.children.values().forEach(function (cn) {
                    cn.hidden = true;
                    d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                    d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                    if (!cn.children.empty())
                        hideChildNodes(cn);
                });
            }
        };

        var anBBoxCoords = Object.create(null),
            wfBBoxCoords = Object.create(null),
            siblings = [];

        /* Expand. */
        if (keyStroke === "e" && (d.nodeType === "layer" || d.nodeType === "analysis" || d.nodeType === "subanalysis")) {

            /* Set node visibility. */
            d3.select("#nodeId-" + d.autoId).classed("hiddenNode", true);
            d.hidden = true;
            d.children.values().forEach(function (cn) {
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", false);
                cn.hidden = false;
                hideChildNodes(cn);
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
            } else if (d.nodeType === "analysis") {
                d.children.values().forEach(function (san) {
                    san.links.values().forEach(function (l) {
                        l.hidden = true;
                        d3.select("#linkId-" + l.autoId).classed("hiddenLink", true);
                        if (l.highlighted) {
                            d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", true);
                        }
                    });
                });
            } else {

                /* Hide layer links. */
                d.predLinks.values().forEach(function (pl) {
                    pl.hidden = true;
                    d3.select("#linkId-" + pl.autoId).classed("hiddenLink", true);
                    if (pl.highlighted) {
                        d3.select("#hLinkId-" + pl.autoId).classed("hiddenLink", true);
                    }
                });
                d.succLinks.values().forEach(function (sl) {
                    sl.hidden = true;
                    d3.select("#linkId-" + sl.autoId).classed("hiddenLink", true);
                    if (sl.highlighted) {
                        d3.select("#hLinkId-" + sl.autoId).classed("hiddenLink", true);
                    }
                });
            }

            /* Set analysis/layer connecting links visibility. */
            d.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    d3.select("#linkId-" + l.autoId).classed("hiddenLink", false);
                    if (l.highlighted) {
                        d3.select("#hLinkId-" + l.autoId).classed("hiddenLink", false);
                    }
                    l.hidden = false;
                });
            });
            d.outputs.values().forEach(function (saon) {
                saon.succLinks.values().forEach(function (l) {
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
                wfBBoxCoords = getWFBBoxCoords(d, 1);
                d.x = 0;
                updateLink(d.parent);
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);

                /* Shift sibling subanalyses vertical. */
                siblings = d.parent.children.values().filter(function (san) {
                    return san !== d && san.y > d.y;
                });
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
                        return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                    });

                /* Center non-expanded subanalyses horizontally. */
                d.parent.children.values().filter(function (san) {
                    return !san.hidden;
                }).forEach(function (san) {
                    san.x = (anBBoxCoords.x.max - anBBoxCoords.x.min) / 2 - vis.cell.width / 2;
                    updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
                });
                //d.x = -(wfBBoxCoords.x.max - wfBBoxCoords.x.min)/2;
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);
            } else if (d.nodeType === "analysis") {

                /* Adjust analysis bounding box. */
                anBBoxCoords = getABBoxCoords(d, 1);
                d3.select("#BBoxId-" + d.autoId).select("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                    });

                /* Update. */
                updateLink(d);
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);
            } else {
                d.children.values().filter(function (an) {
                    return an.filtered;
                }).forEach(function (an) {
                    d3.select("#BBoxId-" + an.autoId).classed({"hiddenBBox": false});

                    /* Hide workflow links. */
                    an.links.values().forEach(function (l) {
                        d3.selectAll("#linkId-" + l.autoId + ",#hLinkId-" + l.autoId).classed("hiddenLink", true);
                    });

                    /* Hide workflow bounding box. */
                    an.children.values().forEach(function (san) {
                        d3.select("#BBoxId-" + san.autoId).classed("hiddenBBox", true);
                    });

                    /* Adjust bounding box. */
                    anBBoxCoords = getABBoxCoords(an, 1);
                    d3.selectAll("#BBoxId-" + an.autoId + ", #aBBClipId-" + an.autoId).select("rect")
                        .attr("width", function () {
                            return cell.width - 2;
                        })
                        .attr("height", function () {
                            return cell.height - 2/* + 3 * scaleFactor * vis.radius*/;
                        });
                });

                /* Update. */
                updateLink(d);
                updateNode(d3.select("#gNodeId-" + d.autoId), d, d.x, d.y);
            }

        } else if (keyStroke === "c" && d.nodeType !== "layer") {
            /* Collapse. */

            /* Collapse subanalyses. */
            if (d.nodeType === "subanalysis") {
                //console.log("#COLLAPSE subanalysis " + d.autoId);


            } else if (d.nodeType === "analysis") {
                //console.log("#COLLAPSE analysis " + d.autoId);

                d.parent.children.values().forEach(function (an) {
                    d3.select("#BBoxId-" + an.autoId).classed({"hiddenBBox": true});
                    an.exaggerated = false;
                });

                /* Set layer label and bounding box. */
                d3.select("#nodeId-" + d.parent.autoId).select("g.labels").select(".lLabel")
                    .text(function () {
                        return d.children.size() + "/" + d.children.size();
                    });

                /* Hide bounding boxes. */
                d3.select("#BBoxId-" + d.parent.autoId).classed({"hiddenBBox": false});
                d.parent.children.values().forEach(function (an) {
                    an.children.values().forEach(function (san) {
                        d3.select("#BBoxId-" + san.autoId).classed("hiddenBBox", true);
                    });
                });

            } else {
                //console.log("#COLLAPSE node " + d.autoId);

                /* Collapse workflow. */
                wfBBoxCoords = getWFBBoxCoords(d.parent, 1);

                /* Shift sibling subanalyses vertical. */
                siblings = d.parent.parent.children.values().filter(function (san) {
                    return san !== d.parent && san.y > d.parent.y;
                });
                siblings.forEach(function (san) {
                    san.y -= wfBBoxCoords.y.max - wfBBoxCoords.y.min - cell.height;
                    updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
                });

                if (d.parent.parent.children.values().filter(function (san) {
                    return san !== d.parent;
                }).some(function (san) {
                    return san.hidden;
                })) {
                    anBBoxCoords = getABBoxCoords(d.parent.parent, 1);
                    d.parent.x = (anBBoxCoords.x.max - anBBoxCoords.x.min) / 2 - vis.cell.width / 2;
                    updateNode(d3.select("#gNodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
                }

                if (d.parent.parent.children.values().filter(function (san) {
                    return san !== d.parent;
                }).every(function (san) {
                    return !san.hidden;
                })) {
                    d.parent.parent.children.values().forEach(function (san) {
                        san.x = 0;
                        updateNode(d3.select("#gNodeId-" + san.autoId), san, san.x, san.y);
                    });
                }
            }

            /* Set node visibility. */
            d.parent.hidden = false;
            d3.select("#nodeId-" + d.parent.autoId).classed("hiddenNode", false);
            hideChildNodes(d.parent);

            /* Set saBBox visibility. */
            if (d.nodeType === "subanalysis") {
                d3.select("#BBoxId-" + d.autoId).classed("hiddenBBox", true);
            } else if (d.nodeType === "analysis") {

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
            d.parent.outputs.values().forEach(function (saon) {
                saon.succLinks.values().forEach(function (l) {
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
                        return cell.height - 2/* + 3 * scaleFactor * vis.radius*/;
                    });

                /* Update links. */
                updateLink(d.parent);

            } else if (d.nodeType === "analysis") {

                /* Check layer Links. */
                d.parent.predLinks.values().forEach(function (pl) {
                    if (!pl.source.hidden) {
                        pl.hidden = false;
                    }
                });
                d.parent.succLinks.values().forEach(function (sl) {
                    if (!sl.target.hidden) {
                        sl.hidden = false;
                    }
                });

                updateLink(d.parent);
                updateNode(d3.select("#gNodeId-" + d.parent.autoId), d.parent, d.parent.x, d.parent.y);
            } else {
                /* Set saBBox visibility. */
                d3.select("#BBoxId-" + d.autoId).classed("hiddenBBox", false);

                /* Update. */
                updateLink(d.parent.parent);
                updateNode(d3.select("#gNodeId-" + d.parent.parent.autoId), d.parent.parent, d.parent.parent.x, d.parent.parent.y);

                /* Compute bounding box for analysis child nodes. */
                anBBoxCoords = getABBoxCoords(d.parent.parent, 1);

                /* Adjust analysis bounding box. */
                d3.selectAll("#BBoxId-" + d.parent.parent.autoId + ", #aBBClipId-" + d.parent.parent.autoId).selectAll("rect")
                    .attr("width", function () {
                        return anBBoxCoords.x.max - anBBoxCoords.x.min;
                    })
                    .attr("height", function () {
                        return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                    });

                /* If the selected subanalysis is the last remaining to collapse, adjust bounding box and clippath. */
                if (!d.parent.parent.children.values().some(function (san) {
                    return san.hidden;
                })) {
                    /* Compute bounding box for analysis child nodes. */
                    anBBoxCoords = getABBoxCoords(d.parent.parent, 1);

                    /* Adjust analysis bounding box. */
                    d3.select("#BBoxId-" + d.parent.parent.autoId).select("rect")
                        .attr("width", function () {
                            return anBBoxCoords.x.max - anBBoxCoords.x.min;
                        })
                        .attr("height", function () {
                            return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                        });

                    /* Adjust clippath. */
                    d3.select("#aBBClipId-" + d.parent.parent.autoId).select("rect")
                        .attr("width", cell.width - 4)
                        .attr("height", cell.height - 2 + 2 * scaleFactor * vis.radius)
                        .attr("rx", cell.width / 5)
                        .attr("ry", cell.height / 5);
                }
                /* Update links. */
                updateLink(d.parent.parent);
            }
        }
        //clearNodeSelection();

        /* Recompute layout. */
        dagreDynamicLayerLayout(vis.graph);

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


    /* TODO: Revise. */
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
                d3.selectAll(".glAnchor").classed("hiddenNode", true);
                d3.selectAll(".grAnchor").classed("hiddenNode", true);
            } else {
                vis.canvas.selectAll(".labels")
                    .classed("hiddenLabel", false);
                d3.selectAll(".glAnchor").classed("hiddenNode", false);
                d3.selectAll(".grAnchor").classed("hiddenNode", false);
            }
        }, transitionTime);


        /* Background rectangle fix. */
        vis.rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," +
            (-newPos[1] / newScale) + ")" + " scale(" + (1 / newScale) + ")");

        /* Quick fix to exclude scale from text labels. */
        vis.canvas.selectAll(".aBBoxLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 2 + "," + (0.5 * scaleFactor * vis.radius) + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".saBBoxLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 0 + "," + 0 + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".nodeDoiLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 0 + "," + (2 * scaleFactor * vis.radius) + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".nodeAttrLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + (-cell.width / 2 + 5) + "," + (-vis.radius) + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".subanalysisLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 0 + "," + 0 + ") scale(" + (1 / newScale) + ")");

        vis.canvas.selectAll(".analysisLabel")
            .transition()
            .duration(transitionTime)
            .attr("transform", "translate(" + 0 + "," + (scaleFactor * vis.radius) + ") scale(" + (1 / newScale) + ")");
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

        /* Layer . */
        lNode.on("mouseover", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverNode", true);
            self.select(".labels").select(".wfLabel").attr("clip-path", "");
        }).on("mousemove", function (d) {
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverNode", false);
            self.select(".labels").select(".wfLabel").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
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
        aBBox.on("mouseover", function (an) {
            var self = d3.select(this);
            self.select(".labels").attr("clip-path", "");

            /*if (!an.hidden) {*/
            an.parent.children.values().forEach(function (sibling) {
                d3.select("#BBoxId-" + sibling.autoId).classed("mouseoverBBox", true);
            });
            /*            } else {
             self.classed("mouseoverBBox", true);
             }*/
        }).on("mouseout", function (an) {
            var self = d3.select(this);
            self.select(".labels").attr("clip-path", "url(#aBBClipId-" + an.autoId + ")");

            an.parent.children.values().forEach(function (sibling) {
                d3.select("#BBoxId-" + sibling.autoId).classed("mouseoverBBox", false);
            });
        });

        /* On mouseover layer bounding box. */
        lBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
        }).on("mouseout", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
        });

        /* On mouseover timeline analysis lines. */
        d3.selectAll(".tlAnalysis").on("mouseover", function (an) {
            showTooltip(
                    createHTMLKeyValuePair("Created", parseISOTimeFormat(an.start)) + "<br>" +
                    createHTMLKeyValuePair("Workflow", getWfNameByNode(an)) + "<br>", event);
            d3.select("#BBoxId-" + an.autoId).classed("mouseoverTlBBox", true);
        }).on("mousemove", function (an) {
            showTooltip(
                    createHTMLKeyValuePair("Created", parseISOTimeFormat(an.start)) + "<br>" +
                    createHTMLKeyValuePair("Workflow", getWfNameByNode(an)) + "<br>", event);
        }).on("mouseout", function (an) {
            hideTooltip();
            d3.select("#BBoxId-" + an.autoId).classed("mouseoverTlBBox", false);
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

        /* Layer tolltips. */
        lNode.on("mouseover", function (d) {
            var self = d3.select(this);
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);
            self.classed("mouseoverNode", true);
            //self.select(".labels").attr("clip-path", "");
        }).on("mousemove", function (d) {
            showTooltip(createHTMLKeyValuePair("autoId", d.autoId) + "<br>" +
                createHTMLKeyValuePair("x", d.x) + "<br>" +
                createHTMLKeyValuePair("y", d.y), event);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            hideTooltip();
            self.classed("mouseoverNode", false);
            //self.select(".labels").attr("clip-path", "url(#bbClipId-" + d.autoId + ")");
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
        aBBox.on("mouseover", function (an) {
            var self = d3.select(this);
            self.select(".labels").attr("clip-path", "");

            /*if (!an.hidden) {*/
            an.parent.children.values().forEach(function (sibling) {
                d3.select("#BBoxId-" + sibling.autoId).classed("mouseoverBBox", true);
            });
            /*            } else {
             self.classed("mouseoverBBox", true);
             }*/

        }).on("mouseout", function (an) {
            var self = d3.select(this);
            self.select(".labels").attr("clip-path", "url(#aBBClipId-" + an.autoId + ")");

            an.parent.children.values().forEach(function (sibling) {
                d3.select("#BBoxId-" + sibling.autoId).classed("mouseoverBBox", false);
            });
        });

        /* On mouseover layer bounding box. */
        lBBox.on("mouseover", function () {
            var self = d3.select(this);
            self.classed("mouseoverBBox", true);
        }).on("mouseout", function (d) {
            var self = d3.select(this);
            self.classed("mouseoverBBox", false);
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
        /* Set layer visibility. */
        lNode.each(function (ln) {
            ln.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        /* Set analysis visibility. */
        aNode.each(function (an) {
            an.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        /* Set subanalysis visibility. */
        saNode.each(function (san) {
            san.hidden = true;
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
        lLink.each(function (l) {
            l.hidden = true;
            d3.select(this).classed("hiddenLink", true);
        });

        /* Adjust bounding boxes. */
        /*aBBox.classed("hiddenBBox", false);
         saBBox.classed("hiddenBBox", false);
         aBBox.select("text").classed("hiddenLabel", false);*/
        saBBox.each(function (san) {
            if (san.filtered && san.children.values().some(function (cn) {
                return !cn.hidden;
            })) {
                d3.select(this).classed("hiddenBBox", false);
            }
        });

        aBBox.each(function (an) {
            if (an.filtered && an.parent.hidden) {
                d3.select(this).classed("hiddenBBox", false);
                d3.select(this).select("text").classed("hiddenLabel", false);
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
                    return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                });
        });
    };

    /**
     * Collapse all analyses into single subanalysis nodes.
     */
    var showAllSubanalyses = function () {
        /* Set layer visibility. */
        lNode.each(function (ln) {
            ln.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

        /* Hide analyses. */
        aNode.each(function (an) {
            d3.select(this).classed("hiddenNode", true);
            an.hidden = true;
        });

        /* Set node visibility. */
        saNode.each(function (san) {
            d3.select(this).classed("hiddenNode", false);
            san.hidden = false;
        });

        /* Set node visibility. */
        node.each(function (n) {
            n.hidden = true;
            d3.select(this).classed("hiddenNode", true);
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
        lLink.each(function (l) {
            l.hidden = true;
            d3.select(this).classed("hiddenLink", true);
        });

        /* Adjust bounding boxes. */
        saBBox.classed("hiddenBBox", true);
        /*aBBox.classed("hiddenBBox", false);
         aBBox.select("text").classed("hiddenLabel", false);*/

        saBBox.each(function (san) {
            if (san.filtered && san.children.values().some(function (cn) {
                return !cn.hidden;
            })) {
                d3.select(this).classed("hiddenBBox", false);
            }
        });

        aBBox.each(function (an) {
            if (an.filtered && (!an.hidden || an.children.values().some(function (cn) {
                return !cn.hidden;
            }))) {
                d3.select(this).classed("hiddenBBox", false);
                d3.select(this).select("text").classed("hiddenLabel", false);
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
                    return (d3.select(this.parentElement).attr("id") === "BBoxId-" + an.autoId) ?
                        cell.width - 2 : cell.width - 4;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                });
        });
    };

    /**
     * Collapse all analyses into single analysis nodes.
     */
    var showAllAnalyses = function () {

        /**
         * Helper function.
         * @param n Current node.
         */
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Set layer visibility. */
        lNode.each(function (ln) {
            ln.hidden = true;
            d3.select(this).classed("hiddenNode", true);
        });

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
        lLink.each(function (l) {
            l.hidden = true;
        });
        lLink.classed({"hiddenLink": true});

        /* Adjust bounding boxes. */

        saBBox.classed("hiddenBBox", true);
        /*aBBox.classed("hiddenBBox", false);
         aBBox.select("text").classed("hiddenLabel", false);*/

        aBBox.each(function (an) {
            if (an.filtered && !an.hidden) {
                d3.select(this).classed("hiddenBBox", false);
            }
        });
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
                    return (d3.select(this.parentElement).attr("id") === "BBoxId-" + an.autoId) ?
                        cell.width - 2 : cell.width - 4;
                })
                .attr("height", function () {
                    return anBBoxCoords.y.max - anBBoxCoords.y.min/* + 3 * scaleFactor * vis.radius*/;
                });
        });
    };

    /**
     * Collapse all layers into single layer nodes.
     */
    var showAllLayers = function () {

        /**
         * Helper function.
         * @param n Base node.
         */
        var hideChildNodes = function (n) {
            n.children.values().forEach(function (cn) {
                cn.hidden = true;
                d3.select("#nodeId-" + cn.autoId).classed("selectedNode", false);
                d3.select("#nodeId-" + cn.autoId).classed("hiddenNode", true);
                if (!cn.children.empty())
                    hideChildNodes(cn);
            });
        };

        /* Set layer visibility. */
        lNode.each(function (ln) {
            ln.hidden = false;
            d3.select(this).classed("hiddenNode", false);
            hideChildNodes(ln);

            if (!ln.children.empty()) {
                handleCollapseExpandNode(ln.children.values()[0], 'c');
            }
        });


        d3.selectAll(".lBBox").classed("hiddenBBox", true);
        lNode.filter(function (ln) {
            return ln.filtered && !ln.hidden;
        }).each(function (ln) {
            d3.select("BBoxId-" + ln.autoId).classed("hiddenBBox", false);
        });

        /* Set link visibility. */
        aNode.each(function (an) {
            an.links.values().forEach(function (l) {
                d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("hiddenLink", true);
                l.hidden = true;
            });
        });

        lLink.each(function (l) {
            l.hidden = false;
        });
        lLink.classed({"hiddenLink": false});

        /* Hide bounding boxes. */
        saBBox.classed("hiddenBBox", true);
        aBBox.classed("hiddenBBox", true);
    };

    /**
     * Handle interaction controls.
     * @param graph Provenance graph object.
     */
    var handleToolbar = function (graph) {

        $("#prov-ctrl-layers-click").click(function () {
            showAllLayers();
            dagreDynamicLayerLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        $("#prov-ctrl-analyses-click").click(function () {
            showAllAnalyses();
            dagreDynamicLayerLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        $("#prov-ctrl-subanalyses-click").click(function () {
            showAllSubanalyses();
            dagreDynamicLayerLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        $("#prov-ctrl-workflows-click").click(function () {
            showAllWorkflows();
            dagreDynamicLayerLayout(graph);
            fitGraphToWindow(nodeLinkTransitionTime);
        });

        /* Switch link styles. */
        $("[id^=prov-ctrl-links-list-]").click(function () {
            $(this).find("input[type='radio']").prop("checked", true);

            var selectedLinkStyle = $(this).find("label").text();
            switch (selectedLinkStyle) {
                case "Bezier":
                    $("#prov-ctrl-links-list-straight").find("input[type='radio']").prop("checked", false);
                    break;
                case "Straight":
                    $("#prov-ctrl-links-list-bezier").find("input[type='radio']").prop("checked", false);
                    break;
            }

            aNode.each(function (an) {
                updateLink(an);
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

        /* Show and hide table. */
        $("#prov-ctrl-show-table").click(function () {
            if (!$("#prov-ctrl-show-table").find("input[type='checkbox']").is(":checked")) {
                d3.select("#provenance-table").style("display", "none");
            } else {
                d3.select("#provenance-table").style("display", "block");
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

        /* Sidebar. */
        $("#prov-ctrl-sidebar-click").click(function () {
            if ($("#provenance-sidebar").css("right") === "0px") {
                $("#provenance-sidebar").animate({right: '-315'}, nodeLinkTransitionTime);
                setTimeout(function () {
                    $("#prov-ctrl-sidebar-click").html("<i class=icon-chevron-left></i>" + "&nbsp;" + "Sidebar");
                }, nodeLinkTransitionTime);
            } else {
                $("#provenance-sidebar").animate({right: '0'}, nodeLinkTransitionTime);
                setTimeout(function () {
                    $("#prov-ctrl-sidebar-click").html("<i class=icon-chevron-right></i>" + "&nbsp;" + "Sidebar");
                }, nodeLinkTransitionTime);
            }
        });
    };


    /* TODO: Recompute layout only after all nodes were collapsed/expanded. */

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
            fitGraphToWindow(1000);
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

        /* Collapse on bounding box click.*/
        var aBBoxClickTimeout;
        aBBox.on("click", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(aBBoxClickTimeout);

            aBBoxClickTimeout = setTimeout(function () {
                if (!draggingActive) {
                    if (d.hidden) {
                        if (d.children.values().some(function (san) {
                            return san.hidden;
                        })) {
                            d.children.values().forEach(function (san) {
                                handleCollapseExpandNode(san.children.values()[0], "c");
                            });
                        } else {
                            handleCollapseExpandNode(d.children.values()[0], "c");
                        }
                    } else {
                        handleCollapseExpandNode(d, "c");
                    }
                    /* Deselect. */
                    clearNodeSelection();

                    /* TODO: Temporarily disabled. */
                    /* Update node doi. */
                    //updateNodeDoi();
                }
            }, 200);
        });

        aBBox.on("dblclick", function (d) {
            if (d3.event.defaultPrevented) return;
            clearTimeout(aBBoxClickTimeout);

            if (!draggingActive) {
                d.children.values().forEach(function (san) {
                    handleCollapseExpandNode(san.children.values()[0], "c");
                });
                handleCollapseExpandNode(d.children.values()[0], "c");
                handleCollapseExpandNode(d, "c");
                /* Deselect. */
                clearNodeSelection();

                /* TODO: Temporarily disabled. */
                /* Update node doi. */
                //updateNodeDoi();
            }
        });

        /* Collapse to layer node. */
        lBBox.on("click", function (d) {
            if (d3.event.defaultPrevented) return;

            if (!draggingActive) {
                d.children.values().forEach(function (an) {
                    an.children.values().forEach(function (san) {
                        handleCollapseExpandNode(san.children.values()[0], "c");
                    });
                    handleCollapseExpandNode(an.children.values()[0], "c");
                });
                handleCollapseExpandNode(d.children.values()[0], "c");

                /* Deselect. */
                clearNodeSelection();

                /* TODO: Temporarily disabled. */
                /* Update node doi. */
                //updateNodeDoi();
            }
        });

        /* Handle path highlighting. */
        d3.selectAll(".glAnchor").on("click", function (d) {
            handlePathHighlighting(d, "p");
        });

        d3.selectAll(".grAnchor").on("click", function (d) {
            handlePathHighlighting(d, "s");
        });

        /* TODO: Temporarily disabled. */
        /*var keydown = function () {
         d3.event.preventDefault();

            if (selectedNodeSet.empty()) return;

            selectedNodeSet.values().forEach(function (d) {
                switch (d3.event.keyCode) {

         case 67: */
        /* c => collapse*/
        /*
         handleCollapseExpandNode(d, "c");
                        break;
         case 69: */
        /* e => expand*/
        /*
         handleCollapseExpandNode(d, "e");
                        break;
         case 80: */
        /* l => highlight predecessors */
        /*
         handlePathHighlighting(d, "p");
                        break;
         case 83: */
        /* r => highlight successors */
        /*
         handlePathHighlighting(d, "s");
                        break;
                }
            });
        };

         d3.select("body").on("keydown", keydown);*/
    };

    /**
     * Compute doi weight based on analysis start time.
     * @param aNodes Analysis nodes.
     */
    var initDoiTimeComponent = function (aNodes) {
        var min = d3.time.format.iso(new Date(0)),
            max = d3.time.format.iso(new Date(0));

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
     * @param lNodes Layer nodes.
     */
    var initDoiFilterComponent = function (lNodes) {
        lNodes.values().forEach(function (ln) {
            ln.filtered = true;
            ln.doi.filteredChanged();

            ln.children.values().forEach(function (an) {
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

        lNodesBAK = vis.graph.lNodes;
        aNodesBAK = vis.graph.aNodes;
        saNodesBAK = vis.graph.saNodes;
        nodesBAK = vis.graph.nodes;
        lLinksBAK = vis.graph.lLinks;
        aLinksBAK = vis.graph.aLinks;

        analysisWorkflowMap = vis.graph.analysisWorkflowMap;

        width = vis.graph.l.width;
        depth = vis.graph.l.depth;

        timeColorScale = createAnalysistimeColorScale(vis.graph.aNodes, ["white", "black"]);
        initDoiTimeComponent(vis.graph.aNodes);

        /* Init all nodes filtered. */
        initDoiFilterComponent(vis.graph.lNodes);
        filterAction = "blend";

        /* Draw analysis links. */
        vis.canvas.append("g").classed({"aHLinks": true});
        vis.canvas.append("g").classed({"aLinks": true});
        updateAnalysisLinks(vis.graph);

        /* Draw layer nodes and links. */
        dagreLayerLayout(vis.graph);
        vis.canvas.append("g").classed({"lLinks": true});
        vis.canvas.append("g").classed({"layers": true});
        updateLayerLinks(vis.graph.lLinks);
        updateLayerNodes(vis.graph.lNodes);

        /* Draw analysis nodes. */
        vis.canvas.append("g").classed({"analyses": true});
        updateAnalysisNodes();

        /* Draw subanalysis nodes. */
        drawSubanalysisNodes();

        /* Draw nodes. */
        drawNodes();

        /* Concat aNode, saNode and node. */
        domNodeset = concatDomClassElements(["lNode", "aNode", "saNode", "node"]);

        /* Add dragging behavior to nodes. */
        applyDragBehavior(layer);
        applyDragBehavior(analysis);

        /* Initiate doi. */
        vis.graph.aNodes.forEach(function (an) {
            handleCollapseExpandNode(an, "c");
        });
        updateNodeFilter();
        updateLinkFilter();
        updateNodeDoi();

        /* Draw timeline view. */
        drawTimelineView(vis);

        /* Draw doi view. */
        drawDoiView();

        /* Event listeners. */
        handleEvents(vis.graph);

        /* Set initial graph position. */
        fitGraphToWindow(0);
    };


    /* TODO: On facet filter reset button, reset filter as well. */
    /**
     * Update filtered nodes.
     */
    var updateNodeFilter = function () {
        /* Hide or blend (un)selected nodes. */

        /* Layers. */
        layer.each(function (ln) {
            var self = d3.select(this).select("#nodeId-" + ln.autoId);
            if (!ln.filtered) {

                /* Blend/Hide layer node. */
                self.classed("filteredNode", false)
                    .classed("blendedNode", function () {
                        return filterAction === "blend" ? true : false;
                    });
                d3.select("#BBoxId-" + ln.autoId).classed("hiddenBBox", true);
            } else {
                self.classed("filteredNode", true).classed("blendedNode", false);
                if (!ln.hidden) {
                    d3.select("#BBoxId-" + ln.autoId).classed("hiddenBBox", false);
                }
            }
        });

        /* Analyses and child nodes. */
        analysis.each(function (an) {
            var self = d3.select(this).select("#nodeId-" + an.autoId);
            if (!an.filtered) {

                /* Blend/Hide analysis. */
                self.classed("filteredNode", false)
                    .classed("blendedNode", function () {
                        return filterAction === "blend" ? true : false;
                    });
                d3.select("#BBoxId-" + an.autoId).classed("hiddenBBox", true);

                /* Update child nodes. */
                an.children.values().forEach(function (san) {
                    d3.select("#nodeId-" + san.autoId)
                        .classed("filteredNode", false)
                        .classed("blendedNode", function () {
                            return filterAction === "blend" ? true : false;
                        });
                    //d3.select("#BBoxId-"+san.autoId).classed("hiddenBBox", true);

                    san.children.values().forEach(function (n) {
                        d3.select("#nodeId-" + n.autoId)
                            .classed("filteredNode", false)
                            .classed("blendedNode", function () {
                                return filterAction === "blend" ? true : false;
                            });
                    });
                });

            } else {

                /* Update child nodes. */
                an.children.values().forEach(function (san) {
                    d3.select("#nodeId-" + san.autoId)
                        .classed("filteredNode", true)
                        .classed("blendedNode", false);
                    //d3.select("#BBoxId-"+san.autoId).classed("hiddenBBox", false);
                    san.children.values().forEach(function (n) {
                        d3.select("#nodeId-" + n.autoId)
                            .classed("filteredNode", true)
                            .classed("blendedNode", false);
                        if (!san.hidden) {
                            d3.select("#BBoxId-" + an.autoId).classed("hiddenBBox", false);
                        }
                    });
                });

                d3.select("#BBoxId-" + an.autoId).classed("hiddenBBox", false);

                /* Display analysis. */
                self.classed("filteredNode", true).classed("blendedNode", false);
            }
        });
    };

    /* TODO: */
    /**
     * Update filtered links.
     */
    var updateLinkFilter = function () {
        saLink.classed("filteredLink", false);

        saNode.each(function (san) {
            if (!san.filtered) {
                san.links.values().forEach( function (l) {
                    d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed("filteredLink", false);
                    if (filterAction === "blend") {
                        d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", true);
                    } else {
                        d3.selectAll("#linkId-" + l.autoId).classed("blendedLink", false);
                    }
                });
            } else {
                san.links.values().forEach( function (l) {
                    d3.selectAll("#linkId-" + l.autoId + ", #hLinkId-" + l.autoId).classed({"filteredLink": true, "blendedLink": false});
                });
            }
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

            vis.graph.lNodes = lNodesBAK;
            vis.graph.aNodes = aNodesBAK;
            vis.graph.saNodes = saNodesBAK;
            vis.graph.nodes = nodesBAK;
            vis.graph.aLinks = aLinksBAK;
            vis.graph.lLinks = lLinksBAK;

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

            /* Update layer filter attributes. */
            vis.graph.lNodes.values().forEach(function (ln) {
                if (ln.children.values().some(function (an) {
                    return an.filtered;
                })) {
                    ln.filtered = true;
                } else {
                    ln.filtered = false;
                }
                ln.doi.filteredChanged();
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
            vis.graph.lLinks.values().forEach(function (ll) {
                ll.filtered = false;
            });
            vis.graph.lLinks.values().filter(function (ll) {
                return ll.source.filtered && ll.target.filtered;
            }).forEach(function (ll) {
                ll.filtered = true;
            });


            /* On filter action 'hide', splice and recompute graph. */
            if (filterAction === "hide") {

                /* Update filtered nodesets. */
                var cpyLNodes = d3.map();
                vis.graph.lNodes.entries().forEach(function (ln) {
                    if (ln.value.filtered) {
                        cpyLNodes.set(ln.key, ln.value);
                    }
                });
                vis.graph.lNodes = cpyLNodes;
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

                /* Update layer links. */
                var cpyLLinks = d3.map();
                vis.graph.lLinks.entries().forEach(function (ll) {
                    if (ll.value.filtered) {
                        cpyLLinks.set(ll.key, ll.value);
                    }
                });
                vis.graph.lLinks = cpyLLinks;
            }

            dagreDynamicLayerLayout(vis.graph);
            fitGraphToWindow(nodeLinkTransitionTime);

            updateNodeFilter();
            updateLinkFilter();
            updateAnalysisLinks(vis.graph);
            updateLayerLinks(vis.graph.lLinks);

            vis.graph.aNodes.forEach(function (an) {
                updateLink(an);
            });
            vis.graph.lNodes.values().forEach(function (ln) {
                updateLink(ln);
            });

            updateNodeDoi();
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