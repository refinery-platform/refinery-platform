/**
 * In-progress development for the refinery provenance graph visualization.
 * Structured w.r.t. the JavaScript module pattern.
 *
 * @author sluger Stefan Luger https://github.com/sluger
 * @exports runProvenanceVisualization The published function to start the visualization.
 */
provenanceVisualizationModule = function () {

    /* Initialize node-link arrays. */
    var nodes = [],
        links = [],
        inputNodes = [],
        outputNodes = [],
        flatAnalyses = [],
        aNodes = [],
        saNodes = [],
        grid = [];

    /* Initialize dom elements. */
    var node = Object.create(null),
        link = Object.create(null),
        analysis = Object.create(null),
        aNode = Object.create(null),
        saNode = Object.create(null),
        gridCell = Object.create(null),
        hLink = Object.create(null),
        hNode = Object.create(null);

    /* TODO: Rewrite for simple maps (https://github.com/mbostock/d3/wiki/Arrays#d3_map). */
    /* Initialize look up hashes. */
    var nodeMap = d3.map(), /* node.uuid -> node.id */
        studyMap = d3.map(),
        studyAssayMap = d3.map(),
        nodePredMap = d3.map(), /* node.id -> predecessor node ids */
        nodeSuccMap = d3.map(), /* node.id -> successor node ids */
        nodeLinkPredMap = d3.map(), /* node.id -> predecessor link ids */
        nodeLinkSuccMap = d3.map(), /* node.id -> successor link ids */
        workflowAnalysisMap = d3.map(),
        analysisWorkflowMap = d3.map(),
        analysisNodeMap = d3.map(),
        nodeAnalysisMap = d3.map();

    /* Restore dummy path link. */
    var dummyPaths = [];

    /* Initialize margin conventions */
    var margin = {top: 20, right: 10, bottom: 20, left: 10};

    /* Initialize canvas dimensions. */
    var width = window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    /* Initialize zoom support. */
    var zoom = Object.create(null);

    /* Set primitive drawing constants. */
    var r = 7,
        color = d3.scale.category20();

    /* Initialize grid-based layout dimensions. */
    var cell = {width: r * 3, height: r * 3},
        layoutDepth = -1,
        layoutWidth = -1,
        firstLayer = 0;

    /**
     * Geometric zoom.
     */
    var redraw = function () {

        /* Translation and scaling. */
        canvas.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");

        /* Fix for rectangle getting translated too - doesn't work after window resize. */
        rect.attr("transform", "translate(" + (-(d3.event.translate[0] + margin.left) / d3.event.scale) + "," + (-(d3.event.translate[1] + margin.top) / d3.event.scale) + ")" + " scale(" + (+1 / d3.event.scale) + ")");
    };

    /* Main canvas drawing area. */
    var canvas = d3.select("#provenance-graph")
        .append("svg:svg")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("pointer-events", "all")
        .append("svg:g")
        .call(zoom = d3.behavior.zoom().on("zoom", redraw)).on("dblclick.zoom", null)
        .append("svg:g");

    /* Helper rectangle to support pan and zoom. */
    var rect = canvas.append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .classed("brect", true);

    /**
     * Reset css for all nodes.
     */
    var clearHighlighting = function () {
        d3.selectAll(".hLink").each(function () {
            d3.select(this).style("display", "none");
        });
        d3.selectAll(".hNode").each(function () {
            d3.select(this).style("display", "none");
        });
    };

    /**
     * Get predecessing nodes for highlighting the path by the current node selection.
     * @param nodeId An Integer id for the node.
     * @param highlighted A Boolean flag whether path should be highlighted or not.
     */
    var highlightPredPath = function (nodeId, highlighted) {
        /* Get svg link element, and for each predecessor call recursively. */
        nodeLinkPredMap[nodeId].forEach(function (l) {
            d3.select("#hLinkId-" + l).style("display", "inline");
            highlightPredPath(links[l].source, highlighted);
        });
    };

    /**
     * Get succeeding nodes for highlighting the path by the current node selection.
     * @param nodeId An Integer id for the node.
     * @param highlighted A Boolean flag whether path should be highlighted or not.
     */
    var highlightSuccPath = function (nodeId, highlighted) {
        /* Get svg link element, and for each successor call recursively. */
        nodeLinkSuccMap[nodeId].forEach(function (l) {
            d3.select("#hLinkId-" + l).style("display", "inline");
            highlightSuccPath(links[l].target, highlighted);
        });
    };

    /**
     * Group nodes by layers into a 2d array.
     * @param tNodes Topological sorted nodes.
     * @returns {Array} Layer grouped array of nodes.
     */
    var groupNodesByCol = function (tNodes) {
        var layer = firstLayer,
            cgtNodes = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(nodes[d.id]));
        });

        cgtNodes.push([]);
        var k = 0;
        rtNodes.forEach(function (n) {
            if (nodes[n.id].col === layer) {
                cgtNodes[k].push(nodes[n.id]);
            } else if (nodes[n.id].col < layer) {
                cgtNodes[nodes[n.id].col].push(nodes[n.id]);
            } else {
                k++;
                layer++;
                cgtNodes.push([]);
                cgtNodes[k].push(nodes[n.id]);
            }
        });
        return cgtNodes;
    };

    /**
     * Deep copy node data structure.
     * @param node Node object.
     * @returns {{name: string, nodeType: string, fileType: string, uuid: string, study: string, assay: string, row: number, col: number, parents: Array, id: number, doiFactor: number, hidden: boolean, bcOrder: number, x: number, y: number, rowBK: {left: number, right: number}, isBlockRoot: boolean, subanalysis: number}, parent: Object}
     */
    var copyNode = function (node) {
        var newNode = {name: "", nodeType: "", fileType: "", uuid: "", study: "", assay: "", row: -1, col: -1, parents: [], id: -1, doiFactor: -1, hidden: true, bcOrder: -1, x: 0, y: 0, rowBK: {left: -1, right: -1}, isBlockRoot: false, subanalysis: -1, parent: {}};

        newNode.name = node.name;
        newNode.nodeType = node.nodeType;
        newNode.fileType = node.fileType;
        newNode.uuid = node.uuid;
        newNode.study = node.study;
        newNode.assay = node.assay;
        newNode.row = node.row;
        newNode.col = node.col;
        newNode.id = node.id;
        node.parents.forEach(function (p, i) {
            newNode.parents[i] = p;
        });
        newNode.analysis = node.analysis;
        newNode.doiFactor = node.doiFactor;
        newNode.hidden = node.hidden;
        newNode.bcOrder = node.bcOrder;
        newNode.x = node.x;
        newNode.y = node.y;
        newNode.rowBK.left = node.rowBK.left;
        newNode.rowBK.right = node.rowBK.right;
        newNode.subanalysis = node.subanalysis;
        newNode.parent = node.parent;

        return newNode;
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     */
    var initRowPlacementLeft = function (lgNodes) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                nodes[n.id].rowBK.left = i;
            });
        });
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     */
    var initRowPlacementRight = function (lgNodes) {

        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                nodes[n.id].rowBK.right = layoutDepth - lg.length + i;
            });
        });
    };

    /**
     * 1-sided crossing minimization via barycentric heuristic.
     * @param lgNodes Layer grouped array of nodes.
     * @returns {Array} Layer grouped array of nodes sorted by barycenter heuristic.
     */
    var oneSidedCrossingMinimisation = function (lgNodes) {

        /* For each layer (fixed layer L0), check layer to the left (variable layer L1). */
        lgNodes.forEach(function (lg, i) {
            var usedCoords = [],
                delta = 0.01;

            /* If there is a layer left to the current layer. */
            if (typeof lgNodes[i + 1] !== "undefined" && lgNodes[i + 1] !== null) {

                /* For each node within the variable layer. */
                lgNodes[i + 1].forEach(function (n) {
                    var degree = 1,
                        accRows = 0;

                    if (nodeSuccMap[n.id].length !== 0) {
                        degree = nodeSuccMap[n.id].length;
                        nodeSuccMap[n.id].forEach(function (s) {
                            accRows += (nodes[s].rowBK.left + 1);
                        });
                    }

                    /* If any node within the layer has the same barycenter value, increase it by a small value. */
                    if (usedCoords.indexOf(accRows / degree) === -1) {
                        nodes[n.id].bcOrder = accRows / degree;
                        usedCoords.push(accRows / degree);
                    } else {
                        nodes[n.id].bcOrder = accRows / degree + delta;
                        usedCoords.push(accRows / degree + delta);
                        delta += 0.01;
                    }
                });
            }
        });

        /* Reorder nodes within layer. */
        var barycenterOrderedNodes = [];
        lgNodes.forEach(function (lg, i) {
            barycenterOrderedNodes[i] = [];
            lg.forEach(function (n, j) {

                /* Init most right layer as fixed. */
                if (i === firstLayer) {
                    nodes[n.id].bcOrder = j + 1;
                    barycenterOrderedNodes[firstLayer][j] = nodes[n.id];

                    /* Set earlier computed bcOrder. */
                } else {
                    barycenterOrderedNodes[i][j] = nodes[n.id];
                }
            });

            /* Reorder by barycentric value. */
            barycenterOrderedNodes[i].sort(function (a, b) {
                return a.bcOrder - b.bcOrder;
            });

            /* Set row attribute after sorting. */
            barycenterOrderedNodes[i].forEach(function (n, k) {
                nodes[n.id].rowBK.left = k;
                nodes[n.id].rowBK.right = layoutWidth - barycenterOrderedNodes[i].length + k;
            });

        });

        return barycenterOrderedNodes;
    };

    /**
     * Remove edges that do not lead to an median neighbor.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var markCandidates = function (bclgNodes) {
        var l = 0;
        while (l < bclgNodes.length) {
            var i = 0;
            while (i < bclgNodes[l].length) {

                /* Mark links as Neighbors:
                 the exact median if the length of successor nodes is odd,
                 else the middle two. */
                var succs = nodeLinkSuccMap[bclgNodes[l][i].id];
                if (succs.length !== 0) {
                    if (succs.length % 2 === 0) {
                        links[succs[parseInt(succs.length / 2 - 1, 10)]].neighbor = true;
                    }
                    links[succs[parseInt(succs.length / 2, 10)]].neighbor = true;
                }
                i++;
            }
            l++;
        }
    };

    /**
     * Mark type 1 - and type 0 conflicts.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var markConflictsLeft = function (bclgNodes) {

        var excludeUpSharedNodeLinks = function (value) {
            return links[value].type0 ? false : true;
        };

        var filterNeighbors = function (value) {
            return links[value].neighbor ? true : false;
        };

        var btUpSuccs = [],
            upSuccs = [];

        /* Backtracked upper successor links. */
        var backtrackUpCrossings = function () {
            btUpSuccs.forEach(function (bts) {
                /* Crossing. */
                if (nodes[links[bts].target].rowBK.left > jMax) {
                    links[bts].type1 = true;
                    links[bts].neighbor = true;
                }
            });
        };

        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var leftMostPredRow = -1,
                leftMostLink = -1;

            /* Get left most link. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target].length > 1) {
                    leftMostPredRow = nodes[links[upSuccs[0]].source].rowBK.left;
                    nodeLinkPredMap[links[ups].target].forEach(function (pl) {
                        if (nodes[links[pl].target].nodeType !== "dummy" || nodes[links[pl].source].nodeType !== "dummy") {

                            /* Check top most link. */
                            if (nodes[links[pl].source].rowBK.left < leftMostPredRow) {
                                leftMostPredRow = nodes[links[pl].source].rowBK.left;
                                leftMostLink = pl;
                            }
                        }
                    });
                }
            });

            /* Mark all but left most links. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target].length > 1 && leftMostLink !== -1) {
                    nodeLinkPredMap[links[ups].target].forEach(function (pl) {
                        if (pl !== leftMostLink) {
                            links[pl].type0 = true;
                            links[pl].neighbor = false;
                        }
                    });
                }
            });

            /* Update upSuccs. */
            upSuccs = upSuccs.filter(excludeUpSharedNodeLinks);

            /* Resolve crossings. */
            var curjMax = jMax;
            upSuccs.forEach(function (ups) {
                if (nodes[links[ups].target].rowBK.left >= jMax) {
                    if (nodes[links[ups].target].rowBK.left > curjMax) {
                        curjMax = nodes[links[ups].target].row;
                    }
                    /* Crossing. */
                } else {
                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be "removed". */
                    if (bclgNodes[upl][i].nodeType !== "dummy" || nodes[links[ups].target].nodeType !== "dummy") {
                        links[ups].type1 = true;

                        /* If link is an inner segment, remove all non-inner segments before which are crossing it. */
                    } else {
                        /* Iterate back in current layer. */
                        var m = i;
                        for (m; m > 0; m--) {
                            if (m < i) {
                                /* Get successors for m */
                                btUpSuccs = nodeLinkSuccMap[bclgNodes[upl][m].id].filter(filterNeighbors);
                                backtrackUpCrossings();
                            }
                        }

                    }
                }
            });
            jMax = curjMax;
        };


        /* Handle crossing upper conflicts (Type 0 and 1)*/
        var upl = 1;
        while (upl < bclgNodes.length) {
            var i = 0,
                jMax = -1,
                iCur = -1;
            while (i < bclgNodes[upl].length) {
                if (typeof bclgNodes[upl][i] !== "undefined") {
                    iCur = i;

                    /* Crossing successor links. */
                    upSuccs = nodeLinkSuccMap[bclgNodes[upl][i].id].filter(filterNeighbors);
                    markUpCrossings();
                }
                i++;
            }
            upl++;
        }
    };

    /**
     * Mark type 1 - and type 0 conflicts.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var markConflictsRight = function (bclgNodes) {

        var excludeUpSharedNodeLinks = function (value) {
            return links[value].type0 ? false : true;
        };

        var filterNeighbors = function (value) {
            return links[value].neighbor ? true : false;
        };

        var btUpSuccs = [],
            upSuccs = [];

        /* Backtracked upper successor links. */
        var backtrackUpCrossings = function () {
            btUpSuccs.forEach(function (bts) {
                /* Crossing. */
                if (nodes[links[bts].target].rowBK.right > jMax) {
                    links[bts].type1 = true;
                    links[bts].neighbor = true;
                }
            });
        };


        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var rightMostPredRow = -1,
                rightMostLink = -1;

            /* Get right most link. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target].length > 1) {
                    rightMostPredRow = nodes[links[upSuccs[0]].source].rowBK.right;
                    nodeLinkPredMap[links[ups].target].forEach(function (pl) {
                        if (nodes[links[pl].target].nodeType !== "dummy" || nodes[links[pl].source].nodeType !== "dummy") {

                            /* Check right most link. */
                            if (nodes[links[pl].source].rowBK.right > rightMostPredRow) {
                                rightMostPredRow = nodes[links[pl].source].rowBK.right;
                                rightMostLink = pl;
                            }
                        }
                    });
                }
            });

            /* Mark all but right most links. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target].length > 1 && rightMostLink !== -1) {
                    nodeLinkPredMap[links[ups].target].forEach(function (pl) {
                        if (pl !== rightMostLink) {
                            links[pl].type0 = true;
                            links[pl].neighbor = false;
                        }
                    });
                }
            });

            /* Update upSuccs. */
            upSuccs = upSuccs.filter(excludeUpSharedNodeLinks);

            /* Resolve crossings. */
            var curjMax = jMax;
            upSuccs.forEach(function (ups) {
                if (nodes[links[ups].target].rowBK.right <= jMax) {
                    if (nodes[links[ups].target].rowBK.right < curjMax) {
                        curjMax = nodes[links[ups].target].rowBK.right;
                    }
                    /* Crossing. */
                } else {

                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be "removed". */
                    if (bclgNodes[upl][i].nodeType !== "dummy" || nodes[links[ups].target].nodeType !== "dummy") {
                        links[ups].type1 = true;

                        /* If link is an inner segment, remove all non-inner segments before which are crossing it. */
                    } else {
                        /* Iterate back in current layer. */
                        var m = i;
                        for (m; m < bclgNodes[upl][i].length; m++) {
                            if (m > i) {
                                /* Get successors for m */
                                btUpSuccs = nodeLinkSuccMap[bclgNodes[upl][m].id].filter(filterNeighbors);
                                backtrackUpCrossings();
                            }
                        }

                    }
                }
            });
            jMax = curjMax;
        };

        /* Handle crossing upper conflicts (Type 0 and 1)*/
        var upl = 1;
        while (upl < bclgNodes.length) {
            var i = bclgNodes[upl].length - 1,
                jMax = bclgNodes[upl].length,
                iCur = -1;
            while (i > 0) {
                if (typeof bclgNodes[upl][i] !== "undefined") {
                    iCur = i;

                    /* Crossing successor links. */
                    upSuccs = nodeLinkSuccMap[bclgNodes[upl][i].id].filter(filterNeighbors);
                    markUpCrossings();
                }
                i--;
            }
            upl++;
        }
    };

    /**
     * Align each vertex with its chosen (left|right and upper/under) Neighbor.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var verticalAlignment = function (bclgNodes) {
        markCandidates(bclgNodes);

        markConflictsLeft(bclgNodes);
        formBlocks(bclgNodes, "left");
        /* Reset conflicts. */
        bclgNodes.forEach(function (lg) {
            lg.forEach(function (n) {
                n.type0 = false;
                n.type1 = false;
            });
        });
        markConflictsRight(bclgNodes);
        formBlocks(bclgNodes, "right");
    };

    /**
     * * After resolving conflicts, no crossings are left and connected paths are concatenated into blocks.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     * @param alignment Left or right aligned layout initialization.
     */
    var formBlocks = function (bclgNodes, alignment) {

        /* Horizontal paths build blocks with its rightmost node being the root.
         * The root element does not own a Neighbor link.
         * Every child - determined by the Neighbor mark of links,
         * will be placed in the exact same row as its root. */

        var isBlockRoot = function (value) {
            return links[value].neighbor;
        };

        var filterNeighbor = function (value) {
            return links[value].neighbor ? true : false;
        };

        /* UPPER */

        /* Iterate through graph layer by layer,
         * if node is root, iterate through block and place nodes into rows. */
        for (var l = 0; l < bclgNodes.length; l++) {
            for (var i = 0; i < bclgNodes[l].length; i++) {
                var succs = nodeLinkSuccMap[nodes[bclgNodes[l][i].id].id].filter(isBlockRoot);

                if (succs.length === 0) {
                    nodes[bclgNodes[l][i].id].isBlockRoot = true;

                    /* Follow path through Neighbors in predecessors and set row to root row. */
                    var rootRow = alignment === "left" ? nodes[bclgNodes[l][i].id].rowBK.left : nodes[bclgNodes[l][i].id].rowBK.right,
                        curLink = -1,
                        curNode = bclgNodes[l][i].id;

                    /* Traverse. */
                    while (curLink !== -2) {
                        curLink = nodeLinkPredMap[curNode].filter(filterNeighbor);
                        if (curLink.length === 0) {
                            curLink = -2;
                        } else {
                            /* Greedy choice for Neighbor when there exist two. */
                            if (alignment === "left") {
                                nodes[links[curLink[0]].source].rowBK.left = rootRow;
                                curNode = links[curLink[0]].source;
                            } else {
                                nodes[links[curLink[curLink.length - 1]].source].rowBK.right = rootRow;
                                curNode = links[curLink[curLink.length - 1]].source;
                            }
                        }
                    }
                }
            }
        }
    };

    /* Code cleanup. */
    /**
     * Balance y-coordinates for each layer by mean of in- and outgoing links.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var balanceLayout = function (bclgNodes) {
        bclgNodes.forEach(function (lg) {
            lg.forEach(function (n) {
                var rootRow = -1;

                if (nodes[n.id].isBlockRoot) {
                    var curNode = n.id,
                        minRow = Math.min(nodes[curNode].rowBK.left, nodes[curNode].rowBK.right),
                        delta = Math.abs(nodes[curNode].rowBK.left - nodes[curNode].rowBK.right) / 2;

                    rootRow = Math.round(minRow + delta);

                    while (nodePredMap[curNode].length !== 0) {
                        nodes[curNode].row = rootRow;
                        curNode = nodePredMap[curNode][0];
                    }
                    if (nodePredMap[curNode].length === 0) {
                        nodes[curNode].row = rootRow;
                    }
                }
            });
        });
    };

    /**
     * Set row placement for nodes in each layer. [Brandes and Köpf 2002]
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var verticalCoordAssignment = function (bclgNodes) {

        verticalAlignment(bclgNodes);

        balanceLayout(bclgNodes);
    };

    /**
     * Set grid layout dimensions.
     * @param lgNodes Layer grouped array of nodes.
     */
    var setGridLayoutDimensions = function (lgNodes) {
        layoutWidth = d3.max(lgNodes, function (lg) {
            return lg.length;
        });

        layoutDepth = lgNodes.length;
    };

    /**
     * Layout node columns.
     * @param lgNodes Layer grouped array of nodes.
     */
    var computeLayout = function (lgNodes) {

        setGridLayoutDimensions(lgNodes);

        /* Init row placement. */
        initRowPlacementLeft(lgNodes);

        /* Init row placement. */
        initRowPlacementRight(lgNodes);

        /* Minimize edge crossings. */
        var bclgNodes = oneSidedCrossingMinimisation(lgNodes);

        /* Update row placements. */
        verticalCoordAssignment(bclgNodes);
    };

    /**
     * Add dummy vertices.
     */
    var addDummyNodes = function () {
        links.forEach(function (l) {
            /* When the link is longer than one column, add dummy nodes. */
            var gapLength = Math.abs(nodes[l.source].col - nodes[l.target].col);

            if (gapLength > 1) {

                dummyPaths.push({
                    id: l.id,
                    source: ({
                        id: l.source,
                        predNodes: nodePredMap[l.source].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: nodeLinkPredMap[l.source].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: nodeSuccMap[l.source].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: nodeLinkSuccMap[l.source].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        })
                    }),
                    target: ({
                        id: l.target,
                        predNodes: nodePredMap[l.target].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: nodeLinkPredMap[l.target].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: nodeSuccMap[l.target].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: nodeLinkSuccMap[l.target].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        })
                    }),
                    parents: nodes[l.target].parents.filter(function (p) {
                        return p;
                    })
                });

                /* Dummy nodes are affiliated with the source node of the link in context. */
                var newNodeId = nodes.length,
                    newLinkId = links.length,
                    predNode = l.source,
                    curCol = nodes[l.source].col,
                    curAnalysis = nodes[l.source].analysis,
                    curStudy = nodes[l.source].study,
                    curAssay = nodes[l.source].assay;

                /* Insert nodes. */
                var i = 0;
                while (i < gapLength - 1) {

                    /* Add node. */
                    nodes.push({
                        name: "dummyNode-" + (newNodeId + i),
                        fileType: "dummy",
                        nodeType: "dummy",
                        uuid: "dummyNode-" + (newNodeId + i),
                        study: curStudy,
                        assay: curAssay,
                        parents: (i === 0) ? [nodes[l.source].uuid] : ["dummyNode-" + predNode],
                        row: -1,
                        rowBK: {left: -1, right: -1},
                        col: curCol + 1,
                        id: newNodeId + i,
                        analysis: curAnalysis,
                        doiFactor: -1,
                        hidden: false,
                        bcOrder: -1,
                        isBlockRoot: false,
                        subanalysis: -1,
                        parent: {}
                    });

                    /* Update node maps. */
                    createNodeHashes(nodes[newNodeId + i], newNodeId + i);

                    nodeAnalysisMap[newNodeId + i] = curAnalysis;
                    predNode = newNodeId + i;
                    curCol++;
                    i++;
                }

                /* Update parents for original target node. */
                nodes[l.target].parents = nodes[l.target].parents.concat([nodes[predNode].uuid]);
                nodes[l.target].parents.splice(nodes[l.target].parents.indexOf(nodes[l.source].uuid), 1);

                /* Insert links (one link more than nodes). */
                predNode = l.source;
                curCol = nodes[l.source].col;

                /* Update original link source. */
                nodeLinkSuccMap[l.source] = nodeLinkSuccMap[l.source].concat([newLinkId]);
                nodeLinkSuccMap[l.source].splice(nodeLinkSuccMap[l.source].indexOf(l.id), 1);
                nodeSuccMap[l.source] = nodeSuccMap[l.source].concat([newNodeId]);
                nodeSuccMap[l.source].splice(nodeSuccMap[l.source].indexOf(l.target), 1);

                /* Insert links. */
                var j = 0;
                while (j < gapLength) {

                    /* Add link. */
                    links.push({
                        source: predNode,
                        target: (j === gapLength - 1) ? l.target : newNodeId + j,
                        id: newLinkId + j,
                        hidden: false,
                        neighbor: false,
                        type0: false,
                        type1: false
                    });

                    /* Update link maps. */
                    if (j < gapLength - 1) {
                        nodePredMap[newNodeId + j] = [predNode];
                        nodeLinkPredMap[newNodeId + j] = [newLinkId + j];
                        nodeLinkSuccMap[newNodeId + j] = [newLinkId + j + 1];
                    }

                    /* Update nodes before target. */
                    if (j < gapLength - 2) {
                        nodeSuccMap[newNodeId + j] = [newNodeId + j + 1];
                    } else if (j === gapLength - 2) {
                        nodeSuccMap[newNodeId + j] = [l.target];
                    }

                    predNode = newNodeId + j;
                    curCol++;
                    j++;
                }
                /* Update original link target. */
                nodeLinkPredMap[l.target] = nodeLinkPredMap[l.target].concat([newLinkId + j - 1]);
                nodeLinkPredMap[l.target].splice(nodeLinkPredMap[l.target].indexOf(l.id), 1);
                nodePredMap[l.target] = nodePredMap[l.target].concat([newNodeId + j - 2]);
                nodePredMap[l.target].splice(nodePredMap[l.target].indexOf(l.source), 1);

                /* Deleting the original link is not necessary as the mappings were removed. */
                /* links[l.id] = null; */
            }
        });
    };

    /**
     * Assign layers.
     * @param tNodes Topology sorted array of nodes.
     */
    var assignLayers = function (tNodes) {
        var layer = 0,
            succ = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(nodes[d.id]));
        });

        rtNodes.forEach(function (n) {

            /* Get outgoing neighbor. */
            succ = nodeSuccMap[n.id];

            if (succ.length === 0) {
                nodes[n.id].col = layer;
                n.col = layer;
            } else {
                var minSuccLayer = layer;
                succ.forEach(function (s) {
                    if (nodes[s].col > minSuccLayer) {
                        minSuccLayer = nodes[s].col;
                    }
                });
                nodes[n.id].col = minSuccLayer + 1;
                n.col = minSuccLayer + 1;
            }
        });
    };

    /**
     * Linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting).
     * @param outputs Nodes which do not have any successor nodes.
     * @returns {*} If graph is acyclic, returns null; else returns topology sorted array of nodes.
     */
    var sortTopological = function (outputs) {
        var s = [], /* Input set. */
            l = [], /* Result set for sorted elements. */
            t = [], /* Deep copy nodes, because we have to delete links from the graph. */
            n = Object.create(null);

        /* Deep copy arrays by value. */
        outputs.forEach(function (outNode) {
            var nodePreds = [];
            nodePredMap[outNode.id].forEach(function (pp) {
                nodePreds.push(pp);
            });
            s.push({id: outNode.id, p: nodePreds, s: []});
        });

        /* Do not consider analysis and subanalysis nodes. */
        nodes.filter(function (n) {
            return n.id >= 0;
        }).forEach(function (selNode) {
            var nodePreds = [];
            nodePredMap[selNode.id].forEach(function (pp) {
                nodePreds.push(pp);
            });
            var nodeSuccs = [];
            nodeSuccMap[selNode.id].forEach(function (ss) {
                nodeSuccs.push(ss);
            });
            t.push({id: selNode.id, p: nodePreds, s: nodeSuccs});
        });

        /* To avoid definition of function in while loop below (added by NG). */
        /* For each successor. */
        var handleInputNodes = function (pred) {
            var index = -1,
                succs = t[pred].s;

            /* For each parent (predecessor), remove edge n->m. Delete parent with p.uuid == n.uuid. */
            succs.forEach(function (ss, k) {
                if (ss == n.id) {
                    index = k;
                }
            });

            /* If parent of successor equals n, delete edge. */
            if (index > -1) {
                succs.splice(index, 1);
            }

            /* If there are no edges left, insert m into s. */
            if (succs.length === 0) {
                s.push(t[pred]);
            }
            /* Else, current successor has other parents to be processed first. */
        };

        /* While the input set is not empty. */
        while (s.length > 0) {

            /* Remove first item n. */
            n = s.shift();

            /* And push it into result set. */
            l.push(n);

            /* Get predecessor node set for n. */
            n.p.forEach(handleInputNodes);
        }

        /* Handle cyclic graphs. */
        if (s.length > 0) {
            return null;
        } else {
            return l;
        }
    };

    /**
     * Extract nodes.
     * @param datasetJsonObj Analysis dataset of type JSON.
     */
    var extractNodes = function (datasetJsonObj) {
        d3.values(datasetJsonObj.value).forEach(function (x, i) {

            /* Assign class string for node types. */
            var nodeType = assignCSSNodeType(x.type);

            /* Extract node properties from api. */
            extractNodeProperties(x, nodeType, i);

            /* Build node hashes. */
            createNodeHashes(x, i);

            /* Sorted set of input nodes. */
            if (x.type === "Source Name") {
                inputNodes.push(nodes[i]);
            }
        });
    };

    /**
     * Set output nodes - nodes not having any successor nodes.
     */
    var setOutputNodes = function () {
        nodes.forEach(function (n) {
            if (typeof nodeSuccMap[n.id] === "undefined") {
                outputNodes.push(n);

                /* Set successor maps for output nodes to an empty array. */
                nodeSuccMap[n.id] = [];
                nodeLinkSuccMap[n.id] = [];
            }
        });
    };

    /**
     * Extract links.
     */
    var extractLinks = function () {
        var linkId = 0;

        nodes.forEach(function (n, i) {
            if (typeof n.uuid !== "undefined") {
                if (typeof n.parents !== "undefined") {
                    var srcNodeIds = [],
                        srcLinkIds = [];

                    /* For each parent entry. */
                    n.parents.forEach(function (p, j) { /* p is be parent node of n. */
                        if (typeof nodeMap[p] !== "undefined") {
                            /* ExtractLinkProperties. */
                            extractLinkProperties(n, linkId, j);

                            /* Build link hashes. */
                            createLinkHashes(p, linkId, i, srcNodeIds, srcLinkIds);
                            linkId++;
                        } else {
                            console.log("ERROR: Dataset might be corrupt - parent: " + p + " of node with uuid: " + n.uuid + " does not exist.");
                        }
                    });
                    nodeLinkPredMap[i] = srcLinkIds;
                    nodePredMap[i] = srcNodeIds;
                } else {
                    console.log("Error: Parents array of node with uuid: " + n.uuid + " is undefined!");
                }
            } else {
                console.log("Error: Node uuid is undefined!");
            }
        });
    };

    /**
     * Extract link properties.
     * @param nodeElem Node object.
     * @param linkId Integer identifier for the link.
     * @param parentIndex Integer index of parent array.
     */
    var extractLinkProperties = function (nodeElem, linkId, parentIndex) {
        links.push({
            source: nodeMap[nodeElem.parents[parentIndex]],
            target: nodeMap[nodeElem.uuid],
            id: linkId,
            hidden: false,
            neighbor: false,
            type0: false,
            type1: false
        });
    };

    /**
     * Create one node representing the whole analysis when aggregated.
     */
    var createAnalysisNodes = function () {
        aNodes.push({"uuid": "dataset", "row": -1, "col": -1, "hidden": true, "id": -1, "nodeType": "analysis", "start": -1, "end": -1, "created": -1, "doiFactor": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": []});

        analyses.objects.filter(function (a) {
            return a.status === "SUCCESS";
        }).forEach(function (a, i) {
            aNodes.push({"uuid": a.uuid, "row": -1, "col": -1, "hidden": true, "id": -i - 2, "nodeType": "analysis", "start": a.time_start, "end": a.time_end, "created": a.creation_date, "doiFactor": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": []});
        });
    };

    /**
     * Build link hashes.
     * @param parentNodeObj Predecessor node object.
     * @param linkId Integer identifier for the link.
     * @param nodeId Integer identifier for the node.
     * @param srcNodeIds Integer array containing all node identifiers preceding the current node.
     * @param srcLinkIds Integer array containing all link identifiers preceding the current node.
     */
    var createLinkHashes = function (parentNodeObj, linkId, nodeId, srcNodeIds, srcLinkIds) {
        srcNodeIds.push(nodeMap[parentNodeObj]);
        srcLinkIds.push(linkId);

        if (nodeSuccMap.hasOwnProperty(nodeMap[parentNodeObj])) {
            nodeSuccMap[nodeMap[parentNodeObj]] = nodeSuccMap[nodeMap[parentNodeObj]].concat([nodeId]);
            nodeLinkSuccMap[nodeMap[parentNodeObj]] = nodeLinkSuccMap[nodeMap[parentNodeObj]].concat([linkId]);
        } else {
            nodeSuccMap[nodeMap[parentNodeObj]] = [nodeId];
            nodeLinkSuccMap[nodeMap[parentNodeObj]] = [linkId];
        }
    };

    /**
     * Build node hashes.
     * @param nodeObj Node object.
     * @param nodeId Integer identifier for the node.
     */
    var createNodeHashes = function (nodeObj, nodeId) {
        nodeMap[nodeObj.uuid] = nodeId;
        studyMap[nodeId] = nodes[nodeId].study;
        studyAssayMap[nodes[nodeId].study] = nodes[nodeId].assay;
    };

    /**
     * Extract node api properties.
     * @param nodeObj Node object.
     * @param nodeType Dataset specified node type.
     * @param nodeId Integer identifier for the node.
     */
    var extractNodeProperties = function (nodeObj, nodeType, nodeId) {
        nodes.push({
            name: nodeObj.name,
            fileType: nodeObj.type,
            nodeType: nodeType,
            uuid: nodeObj.uuid,
            study: (nodeObj.study !== null) ? nodeObj.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
            assay: (nodeObj.assay !== null) ? nodeObj.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
            parents: nodeObj.parents.map(function (y) {
                return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
            }),
            row: -1,
            rowBK: {left: -1, right: -1},
            col: -1,
            id: nodeId,
            analysis: (nodeObj.analysis_uuid !== null) ? nodeObj.analysis_uuid : "dataset",
            doiFactor: -1,
            hidden: false,
            bcOrder: -1,
            isBlockRoot: false,
            x: 0,
            y: 0,
            subanalysis: nodeObj.subanalysis,
            parent: {}
        });
    };

    /**
     * Assign CSS class for node types.
     * @param nodeType Dataset specified node type.
     * @returns {string} The CSS class corresponding the type of the node.
     */
    var assignCSSNodeType = function (nodeType) {
        var nodeTypeClass = "";

        switch (nodeType) {
            case "Source Name":
            case "Sample Name":
            case "Assay Name":
                nodeTypeClass = "special";
                break;
            case "Data Transformation Name":
                nodeTypeClass = "dt";
                break;
            default:
                nodeTypeClass = "processed";
                break;
        }

        return nodeTypeClass;
    };


    /* TODO: For analysis nodes, derive information from subanalysis nodes.*/
    /**
     * For each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it.
     */
    var createAnalysisNodeMapping = function () {

        /* Create sub-analysis node. */
        var sanId = -1 * aNodes.length - 1;
        aNodes.forEach(function (an) {
            nodes.filter(function (n) {
                return n.analysis === an.uuid;
            }).forEach(function (n) {
                if (!an.children.hasOwnProperty(n.subanalysis)) {
                    var san = {"id": sanId, "subanalysis": n.subanalysis, "nodeType": "subanalysis", "row": -1, "col": -1, "hidden": true, "doiFactor": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": [], "parent": an};
                    saNodes.push(san);
                    an.children[n.subanalysis] = san;
                    sanId--;
                }
            });
        });

        saNodes.forEach(function (san) {

            /* Set child nodes for subanalysis. */
            san.children = nodes.filter(function (n) {
                return san.parent.uuid === n.analysis && n.subanalysis === san.subanalysis;
            });

            /* Set subanalysis parent for nodes. */
            san.children.forEach(function (n) {
                n.parent = san;
            });

            /* Set inputnodes for subanalysis. */
            san.inputs = san.children.filter(function (n) {
                return nodePredMap[n.id].some(function (p) {
                    return nodes[p].analysis !== san.parent.uuid;
                }) || nodePredMap[n.id].length === 0;
                /* If no src analyses exists. */
            });

            /* Set outputnodes for subanalysis. */
            san.outputs = san.children.filter(function (n) {
                return nodeSuccMap[n.id].length === 0 || nodeSuccMap[n.id].some(function (s) {
                    return nodes[s].analysis !== san.parent.uuid;
                });
            });
        });

        saNodes.forEach(function (san) {

            /* Set predecessor subanalyses. */
            san.inputs.forEach(function (n) {
                nodePredMap[n.id].forEach(function (pn) {
                    if (san.preds.indexOf(nodes[pn].parent) === -1) {
                        san.preds.push(nodes[pn].parent);
                    }
                });
            });

            /* Set successor subanalyses. */
            san.outputs.forEach(function (n) {
                nodeSuccMap[n.id].forEach(function (sn) {
                    if (san.succs.indexOf(nodes[sn].parent) === -1) {
                        san.succs.push(nodes[sn].parent);
                    }
                });
            });
        });

        /* Set maps for subanalysis. */
        saNodes.forEach(function (san) {
            nodePredMap[san.id] = [];
            nodeLinkPredMap[san.id] = [];
            san.inputs.forEach(function (sain) {
                nodePredMap[san.id] = nodePredMap[san.id].concat(nodePredMap[sain.id]);
                nodeLinkPredMap[san.id] = nodeLinkPredMap[san.id].concat(nodeLinkPredMap[sain.id]);
            });

            nodeSuccMap[san.id] = [];
            nodeLinkSuccMap[san.id] = [];
            san.outputs.forEach(function (saon) {
                nodeSuccMap[san.id] = nodeSuccMap[san.id].concat(nodeSuccMap[saon.id]);
                nodeLinkSuccMap[san.id] = nodeLinkSuccMap[san.id].concat(nodeLinkSuccMap[saon.id]);
            });
        });

        /* Set links for subanalysis. */
        saNodes.forEach(function (san) {
            san.links = links.filter(function (l) {
                return l !== null && san.parent.uuid === nodes[l.target].analysis && nodes[l.target].subanalysis === san.subanalysis;
            });
        });

        /* Add subanalysis to nodes collection. */
        saNodes.forEach(function (san) {
            nodes[san.id] = san;
        });


        var sortByRow = function (a, b) {
            return a.row > b.row;
        };

        /* Create analysisNodeMap. */
        nodes.filter(function (n) {
            return n.id >= 0;
        }).forEach(function (n, i) {
            if (analysisNodeMap.hasOwnProperty(n.analysis)) {
                analysisNodeMap[n.analysis] = analysisNodeMap[n.analysis].concat([i]);
            } else {
                analysisNodeMap[n.analysis] = [i];
            }
        });


        // TODO: analysis
        aNodes.forEach(function (an) {
            /* Set nodes. */


        });

        aNodes.forEach(function (an) {
            /* Set nodes. */
            an.children = analysisNodeMap[an.uuid].map(function (d) {
             nodeAnalysisMap[d] = an.id;
             return nodes[d];
            /*flatten nodes objects. */
            }).sort(sortByRow);

            /* Set input nodes. */
            an.inputs = an.children.filter(function (n) {
                return nodePredMap[n.id].some(function (p) {
                    return nodes[p].analysis != an.uuid;
                }) || nodePredMap[n.id].length === 0;
                /* If no src analyses exists. */
            }).sort(sortByRow);

            /* Set output nodes. */
            an.outputs = an.children.filter(function (n) {
                return nodeSuccMap[n.id].length === 0 || nodeSuccMap[n.id].some(function (s) {
                    return nodes[s].analysis != an.uuid;
                });
            }).sort(sortByRow);
        });

        aNodes.forEach(function (an) {

            /* Set predecessor analyses. */
            if (an.uuid != "dataset") {
                an.inputs.forEach(function (n) {
                    nodePredMap[n.id].forEach(function (pn) {
                        if (an.preds.indexOf(nodeAnalysisMap[pn]) === -1) {
                            an.preds.push(nodeAnalysisMap[pn]);
                        }
                    });
                });
            }

            /* Set successor analyses. */
            an.outputs.forEach(function (n) {
                if (nodeSuccMap[n.id].length !== 0) {
                    nodeSuccMap[n.id].forEach(function (s) {
                        if (an.succs.indexOf(nodeAnalysisMap[s]) === -1 && nodeAnalysisMap[s] !== an.id) {
                            an.succs.push(nodeAnalysisMap[s]);
                        }
                    });
                }
            });
        });

        /* Set links. */
        aNodes.forEach(function (an) {
            an.links = links.filter(function (l) {
                return l !== null && nodeAnalysisMap[l.target] == an.id;
            });
        });

        /* Add to nodes. */
        aNodes.forEach(function (an, i) {
            nodes[-i - 1] = aNodes[i];
        });

        /* Set maps. */
        aNodes.forEach(function (an) {
            nodePredMap[an.id] = [];
            nodeLinkPredMap[an.id] = [];
            an.inputs.forEach(function (ain) {
                nodePredMap[an.id] = nodePredMap[an.id].concat(nodePredMap[ain.id]);
                nodeLinkPredMap[an.id] = nodeLinkPredMap[an.id].concat(nodeLinkPredMap[ain.id]);
            });

            nodeSuccMap[an.id] = [];
            nodeLinkSuccMap[an.id] = [];
            an.outputs.forEach(function (ain) {
                nodeSuccMap[an.id] = nodeSuccMap[an.id].concat(nodeSuccMap[ain.id]);
                nodeLinkSuccMap[an.id] = nodeLinkSuccMap[an.id].concat(nodeLinkSuccMap[ain.id]);
            });
        });
    };

    /**
     * Extract workflows from analyses. A workflow might be executed by multiple analyses.
     */
    var createWorkflowAnalysisMapping = function () {
        analyses.objects.filter(function (a) {
            return a.status === "SUCCESS";
        }).forEach(function (a) {

            /* Workflow -> analysis. */
            if (workflowAnalysisMap.hasOwnProperty(a.workflow__uuid)) {
                workflowAnalysisMap[a.workflow__uuid] = workflowAnalysisMap[a.workflow__uuid].concat([a.uuid]);
            } else {
                workflowAnalysisMap[a.workflow__uuid] = [a.uuid];
            }

            /* Analysis -> workflow. */
            analysisWorkflowMap[a.uuid] = a.workflow__uuid;
        });

        flatAnalyses = [].concat.apply(["dataset"], d3.values(workflowAnalysisMap));
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
     * Creates analysis group dom elements which then contain the nodes and links of an analysis.
     */
    var createAnalysisLayers = function () {
        var aId = -1;

        /* Add analyses dom groups. */
        aNodes.forEach(function () {
            canvas.append("g")
                .classed("analysis", true)
                .attr("id", function () {
                    return "aId-" + aId;
                });
            aId--;
        });
        analysis = d3.selectAll(".analysis");
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
        dom.attr("transform", function (d) {
            switch (d.nodeType) {
                case "dummy":
                case "raw":
                case "analysis":
                case "subanalysis":
                case "processed":
                    return "translate(" + x + "," + y + ")";
                case "special":
                    return "translate(" + (x - r) + "," + (y - r) + ")";
                case "dt":
                    return "translate(" + (x - r * 0.75) + "," + (y - r * 0.75) + ")";
            }
        });
        /* TODO: Revise potential translation bug. */
        d3.select("#hNodeId-" + n.id).attr("transform", function (d) {
            return "translate(" + (x - cell.width / 2) + "," + (y - cell.height / 2) + ")";
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
        /* Get input links and update coordinates for x2 and y2. */
        nodeLinkPredMap[n.id].forEach(function (l) {
            d3.selectAll("#linkId-" + l + ", #hLinkId-" + l).attr("d", function (l) {
                var pathSegment = "";
                /* Source is analysis node. */
                if (nodes[l.source].hidden) {
                    pathSegment = " M" + parseInt(nodes[nodeAnalysisMap[l.source]].x, 10) + "," + parseInt(nodes[nodeAnalysisMap[l.source]].y, 10);
                    if (Math.abs(nodes[nodeAnalysisMap[l.source]].x - x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + parseInt(nodes[nodeAnalysisMap[l.source]].x + (cell.width)) + "," + parseInt(y, 10) + " L" + parseInt(x, 10) + "," + parseInt(y, 10));
                    } else {
                        pathSegment = pathSegment.concat(" L" + parseInt(x, 10) + "," + parseInt(y, 10));
                    }
                } else {
                    /* Source is node. */
                    pathSegment = " M" + parseInt(nodes[l.source].x, 10) + "," + parseInt(nodes[l.source].y, 10);
                    if (Math.abs(nodes[l.source].x - x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.source].x + (cell.width)) + "," + parseInt(y, 10) + " L" + parseInt(x, 10) + "," + parseInt(y, 10));
                    } else {
                        pathSegment = pathSegment.concat(" L" + parseInt(x, 10) + "," + parseInt(y, 10));
                    }
                }
                return pathSegment;
            });
        });

        /* Get output links and update coordinates for x1 and y1. */
        nodeLinkSuccMap[n.id].forEach(function (l) {
            d3.selectAll("#linkId-" + l + ", #hLinkId-" + l).attr("d", function (l) {
                var pathSegment = " M" + parseInt(x, 10) + "," + parseInt(y, 10);
                /* Target is analysis node. */
                if (nodes[l.target].hidden) {
                    if (Math.abs(x - nodes[nodeAnalysisMap[l.target]].x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + parseInt(x + cell.width, 10) + "," + parseInt(nodes[nodeAnalysisMap[l.target]].y, 10) + " L" + parseInt(nodes[nodeAnalysisMap[l.target]].x, 10) + " " + parseInt(nodes[nodeAnalysisMap[l.target]].y, 10));
                    } else {
                        pathSegment = pathSegment.concat(" L" + parseInt(nodes[nodeAnalysisMap[l.target]].x, 10) + "," + parseInt(nodes[nodeAnalysisMap[l.target]].y, 10));
                    }
                } else {
                    /* Target is node. */
                    if (Math.abs(x - nodes[l.target].x) > cell.width) {
                        pathSegment = pathSegment.concat(" L" + parseInt(x + cell.width, 10) + "," + parseInt(nodes[l.target].y, 10) + " L" + parseInt(nodes[l.target].x, 10) + " " + parseInt(nodes[l.target].y, 10));
                    } else {
                        pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.target].x, 10) + "," + parseInt(nodes[l.target].y, 10));
                    }
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
        d3.selectAll(".node").call(drag);
    };

    /**
     * Sets the drag events for analysis nodes.
     */
    var applyAnalysisDragBehavior = function () {

        /* Drag and drop node enabled. */
        var analysisDrag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".aNode").call(analysisDrag);
    };

    /**
     * Sets the drag events for sub-nalysis nodes.
     */
    var applySubanalysisDragBehavior = function () {

        /* Drag and drop node enabled. */
        var subanalysisDrag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".saNode").call(subanalysisDrag);
    };

    /**
     * Dye graph by analyses and its corresponding workflows.
     */
    var dyeWorkflows = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("stroke", function (d) {
                return color(analysisWorkflowMap[d.analysis]);
            });
        });

    };

    /**
     * Dye graph by analyses.
     */
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("fill", function (d) {
                return color(d.analysis);
            });
        });

    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for analysis only nodes.
     */
    var initAnalysisLayout = function () {
        aNodes.forEach(function (an) {
            var rootCol;

            if (an.succs.length > 0) {
                rootCol = nodes[an.succs[0]].inputs[0].col;

                an.succs.forEach(function (san) {
                    if (typeof san !== "undefined" && san !== null) {
                        nodes[san].inputs.forEach(function (sanIn) {
                            if (sanIn.col + 1 > rootCol) {
                                rootCol = sanIn.col + 1;
                            }
                        });
                    }
                });
            } else {
                if (an.outputs.length > 0) {
                    rootCol = an.outputs[0].col;
                } else {
                    an.col = firstLayer;
                }
            }

            an.col = rootCol;
            an.x = -an.col * cell.width;
            an.row = an.outputs.map(function (aon) {
                return aon.row;
            })[parseInt(an.outputs.length / 2, 10)];
            an.y = an.row * cell.height;
        });
    };

    /* TODO: Dynamic layout compensation. */
    /**
     * Create initial layout for sub-analysis only nodes.
     */
    var initSubanalysisLayout = function () {
        saNodes.forEach(function (san) {
            var rootCol;

            if (san.succs.length > 0) {
                rootCol = san.succs[0].inputs[0].col;

                san.succs.forEach(function (sasn) {
                    if (typeof sasn !== "undefined" && sasn !== null) {
                        sasn.inputs.forEach(function (sasnIn) {
                            if (sasnIn.col + 1 > rootCol) {
                                rootCol = sasnIn.col + 1;
                            }
                        });
                    }
                });
            } else {
                if (san.outputs.length > 0) {
                    rootCol = san.outputs[0].col;
                } else {
                    san.col = firstLayer;
                }
            }

            san.col = rootCol;
            san.x = -san.col * cell.width;
            san.row = san.outputs.map(function (aon) {
                return aon.row;
            })[parseInt(san.outputs.length / 2, 10)];
            san.y = san.row * cell.height;
        });
    };

    /**
     * Restore links where dummy nodes were inserted in order to process the layout.
     */
    var removeDummyNodes = function () {
        /* Clean up links. */
        for (var i = 0; i < links.length; i++) {
            var l = links[i];

            /* Clean source. */
            if (nodes[l.source].nodeType != "dummy" && nodes[l.target].nodeType == "dummy") {
                nodeSuccMap[l.source].splice(nodeSuccMap[l.source].indexOf(l.target), 1);
                nodeLinkSuccMap[l.source].splice(nodeLinkSuccMap[l.source].indexOf(l.id), 1);
                nodeAnalysisMap[l.target] = null;
                links.splice(i, 1);
                i--;
            }
            /* Clean target. */
            else if (nodes[l.source].nodeType == "dummy" && nodes[l.target].nodeType != "dummy") {
                nodes[l.target].parents.splice(nodes[l.target].parents.indexOf(nodes[l.source].uuid), 1);
                nodePredMap[l.target].splice(nodePredMap[l.target].indexOf(l.source), 1);
                nodeLinkPredMap[l.target].splice(nodeLinkPredMap[l.target].indexOf(l.id), 1);
                nodeAnalysisMap[l.source] = null;
                links.splice(i, 1);
                i--;
            }
            /* Remove pure dummy links. */
            else if (nodes[l.source].nodeType == "dummy" && nodes[l.target].nodeType == "dummy") {
                nodePredMap[l.target].splice(nodePredMap[l.target].indexOf(l.source), 1);
                nodeLinkPredMap[l.target].splice(nodeLinkPredMap[l.target].indexOf(l.id), 1);
                nodeSuccMap[l.source].splice(nodeSuccMap[l.source].indexOf(l.target), 1);
                nodeLinkSuccMap[l.source].splice(nodeLinkSuccMap[l.source].indexOf(l.id), 1);
                nodeAnalysisMap[l.source] = null;
                links.splice(i, 1);
                i--;
            }
        }

        /* Clean up nodes. */
        for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];

            if (n.nodeType == "dummy") {
                nodePredMap[n.id] = [];
                nodeLinkPredMap[n.id] = [];
                nodeSuccMap[n.id] = [];
                nodeLinkSuccMap[n.id] = [];
                nodes.splice(j, 1);
                j--;
            }
        }

        /* Restore links. */
        dummyPaths.forEach(function (dP) {
            var source = links[dP.id].source,
                target = links[dP.id].target;

            nodePredMap[target] = nodePredMap[target].concat(dP.target.predNodes.filter(function (pn) {
                return nodePredMap[target].indexOf(pn) === -1;
            }));
            nodeLinkPredMap[target] = nodeLinkPredMap[target].concat(dP.target.predNodeLinks.filter(function (pnl) {
                return nodeLinkPredMap[target].indexOf(pnl) === -1;
            }));
            nodeSuccMap[source] = nodeSuccMap[source].concat(dP.source.succNodes.filter(function (sn) {
                return nodeSuccMap[source].indexOf(sn) === -1;
            }));
            nodeLinkSuccMap[source] = nodeLinkSuccMap[source].concat(dP.source.succNodeLinks.filter(function (snl) {
                return nodeLinkSuccMap[source].indexOf(snl) === -1;
            }));
            nodes[target].parents = nodes[target].parents.concat(dP.parents.filter(function (p) {
                return nodes[target].parents.indexOf(p) === -1;
            }));
        });
        dummyPaths = [];
    };

    /**
     * Compress analysis horizontally.
     */
    var horizontalAnalysisAlignment = function () {
        aNodes.forEach(function (an) {

            var maxOutput = d3.max(an.outputs, function (d) {
                return d.col;
            });

            an.outputs.filter(function (d) {
                return d.col < maxOutput;
            }).forEach(function (ano) {
                var curNode = ano,
                    j = 0;

                /* Check for gaps. */
                if (curNode.col < maxOutput) {

                    /* Get first node for this block. */
                    var curBlockNode = curNode;
                    while (nodePredMap[curBlockNode.id].length === 1 &&
                        nodes[nodePredMap[curBlockNode.id][0]].analysis === an.uuid &&
                        nodes[nodePredMap[curBlockNode.id][0]].col - curBlockNode.col === 1) {
                        curBlockNode = nodes[nodePredMap[curBlockNode.id][0]];
                    }

                    /* When pred for leading block node is of the same analysis. */
                    while (curNode.col < maxOutput &&
                        nodePredMap[curBlockNode.id].length === 1 &&
                        nodes[nodePredMap[curBlockNode.id][0]].analysis === an.uuid &&
                        nodePredMap[curNode.id].length === 1) {
                        var predNode = nodes[nodePredMap[curNode.id][0]];
                        if (predNode.col - curNode.col > 1) {

                            var shiftCurNode = curNode,
                                colShift = maxOutput + j;

                            /* Shift the gap to align with the maximum output column of this analysis. */
                            while (shiftCurNode !== ano) {
                                shiftCurNode.col = colShift;

                                shiftCurNode = nodes[nodeSuccMap[shiftCurNode.id]];
                                colShift--;
                            }
                            ano.col = colShift;
                        }
                        j++;
                        curNode = predNode;
                    }
                }
            });
        });
    };

    /**
     * Analyses without successor analyses are shifted left.
     */
    var leftShiftAnalysis = function () {
        aNodes.forEach(function (an) {

            var leftMostInputCol = d3.max(an.inputs, function (ain) {
                return ain.col;
            });
            var rightMostPredCol = layoutDepth;


            an.inputs.forEach(function (ain) {
                var curMin = d3.min(nodePredMap[ain.id].map(function (pn) {
                    return nodes[pn];
                }), function (ainpn) {
                    return ainpn.col;
                });

                if (curMin < rightMostPredCol) {
                    rightMostPredCol = curMin;
                }
            });

            /* Shift when gap. */
            if (rightMostPredCol - leftMostInputCol > 1 && an.succs.length === 0) {
                an.children.forEach(function (n) {
                    n.col += rightMostPredCol - leftMostInputCol - 1;
                });
            }
        });
    };

    /**
     * Try to center analysis via grid lookup.
     */
    var centerAnalysisOnRightSplit = function () {
        /* Iterate from right to left, column-wise. */

        var isAnotherAnalysis = function (sn) {
            return nodes[sn].analysis !== nodes[grid[i][j]].analysis;
        };

        var getMedianRow = function (nid) {
            nodeSuccMap[nid].sort(function (a, b) {
                return nodes[a].row > nodes[b].row;
            });
            return nodes[nodeSuccMap[nid][Math.floor(nodeSuccMap[nid].length / 2)]].row;
        };

        for (var i = 0; i < layoutDepth; i++) {
            for (var j = 0; j < layoutWidth; j++) {
                if (grid[i][j] !== "undefined" && nodeSuccMap[grid[i][j]].length > 1 && nodeSuccMap[grid[i][j]].some(isAnotherAnalysis)) {

                    /* Within this analysis and for each predecessor, traverse back and shift rows. */
                    var newRow = getMedianRow(grid[i][j]),
                        curNode = grid[i][j];

                    while (nodePredMap[curNode].length === 1) {
                        grid[i][j] = "undefined";
                        grid[i][newRow] = curNode;
                        nodes[curNode].row = newRow;
                        curNode = nodePredMap[curNode];
                    }
                    if (nodePredMap[curNode].length === 0) {
                        grid[i][j] = "undefined";
                        grid[i][newRow] = curNode;
                        nodes[curNode].row = newRow;
                    }
                }
            }
        }
    };

    /**
     * Maps the column/row index to nodes.
     */
    var createNodeGrid = function () {
        for (var i = 0; i < layoutDepth; i++) {
            grid.push([]);
            for (var j = 0; j < layoutWidth; j++) {
                grid[i].push([]);
                grid[i][j] = "undefined";
            }
        }

        nodes.forEach(function (n) {
            grid[n.col][n.row] = n.id;
        });
    };

    /**
     * Optimize layout.
     */
    var postprocessLayout = function () {

        horizontalAnalysisAlignment();

        leftShiftAnalysis();

        createNodeGrid();

        centerAnalysisOnRightSplit();

        /* TODO: When centering at a split, check block-class with occupied rows/cols (Compaction). */
        /* TODO: Form classes for blocks and rearrange analysis. */
    };

    /**
     * Draw links.
     */
    var drawLinks = function () {
        link = canvas.append("g").classed({"links": true}).selectAll(".link")
            .data(links.filter(function (l) {
                return l !== null && typeof l !== "undefined";
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(nodes[l.source].x, 10) + "," + parseInt(nodes[l.source].y, 10);
                if (Math.abs(nodes[l.source].x - nodes[l.target].x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.source].x + (cell.width)) + "," + parseInt(nodes[l.target].y, 10) + " H" + parseInt(nodes[l.target].x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.target].x, 10) + "," + parseInt(nodes[l.target].y, 10));
                }
                return pathSegment;
            })
            .classed({
                "link": true
            })
            .style("opacity", 0.0)
            .attr("id", function (l) {
                return "linkId-" + l.id;
            }).style("display", function (l) {
                return l.hidden ? "none" : "inline";
            });

        /* TODO: FIX: in certain cases, tooltips collide with canvas bounding box */
        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (l) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + l.id + "</span><br>" +
                    "<strong>Source Id:</strong> <span style='color:#fa9b30'>" + l.source + "</span><br>" +
                    "<strong>Target Id:</strong> <span style='color:#fa9b30'>" + l.target + "</span>";
            });

        /* Invoke tooltip on dom element. */
        link.call(tip);
        link.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /**
     * Draw sub-analysis nodes.
     */
    var drawSubanalysisNodes = function () {
        analysis.each(function (d, i) {
            d3.select(this).selectAll(".saNode")
                .data(saNodes.filter(function (san) {
                    return san.parent.id == -i - 1;
                }))
                .enter().append("g").each(function (san) {
                    d3.select(this).classed({"saNode": true})
                        .attr("transform", "translate(" + san.x + "," + san.y + ")")
                        .attr("id", function () {
                            return "saNodeId-" + san.id;
                        })
                        .style("display", function () {
                            return !san.hidden ? "none" : "inline";
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-r) + " " +
                                (r) + "," + (-r / 2) + " " +
                                (r) + "," + (r / 2) + " " +
                                "0" + "," + (r) + " " +
                                (-r) + "," + (r / 2) + " " +
                                (-r) + "," + (-r / 2);
                        })
                        .style("fill", function () {
                            return color(san.parent.uuid);
                        })
                        .style("stroke", function () {
                            return color(analysisWorkflowMap[san.parent.uuid]);
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
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
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
     */
    var drawAnalysisNodes = function () {
        analysis.each(function (d, i) {
            d3.select(this).selectAll(".aNode")
                .data(aNodes.filter(function (an) {
                    return an.id == -i - 1;
                }))
                .enter().append("g").each(function (an) {
                    d3.select(this).classed({"aNode": true, "superANode": true})
                        .attr("transform", "translate(" + an.x + "," + an.y + ")")
                        .attr("id", function () {
                            return "aNodeId-" + an.id;
                        })
                        .style("display", function () {
                            return an.hidden ? "none" : "inline";
                        })
                        .append("polygon")
                        .attr("points", function () {
                            return "0," + (-2 * r) + " " +
                                (2 * r) + "," + (-r) + " " +
                                (2 * r) + "," + (r) + " " +
                                "0" + "," + (2 * r) + " " +
                                (-2 * r) + "," + (r) + " " +
                                (-2 * r) + "," + (-r);
                        })
                        .style("fill", function () {
                            return color(an.uuid);
                        })
                        .style("stroke", function () {
                            return color(analysisWorkflowMap[an.uuid]);
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
                return d.id === -1 ? "<span style='color:#fa9b30'>Original dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
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
        analysis.each(function (a, i) {
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return nodeAnalysisMap[n.id] == -i - 1;
                }))
                .enter().append("g").style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                }).each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", r);
                    } else {
                        if (d.nodeType === "special") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - r) + "," + (d.y - r) + ")")
                                .append("rect")
                                .attr("width", r * 2)
                                .attr("height", r * 2);
                        } else if (d.nodeType === "dt") {
                            d3.select(this)
                                .attr("transform", "translate(" + (d.x - r * 0.75) + "," + (d.y - r * 0.75) + ")")
                                .append("rect")
                                .attr("width", r * 1.5)
                                .attr("height", r * 1.5)
                                .attr("transform", function () {
                                    return "rotate(45 " + (r * 0.75) + "," + (r * 0.75) + ")";
                                });
                        }
                    }
                }).classed({
                    "node": true,
                    "rawNode": (function (d) {
                        return d.nodeType === "raw";
                    }),
                    "dummyNode": (function (d) {
                        return d.nodeType === "dummy";
                    }),
                    "specialNode": (function (d) {
                        return d.nodeType === "special";
                    }),
                    "dtNode": (function (d) {
                        return d.nodeType === "dt";
                    }),
                    "processedNode": (function (d) {
                        return d.nodeType === "processed";
                    })
                }).attr("id", function (d) {
                    return "nodeId-" + d.id;
                });
        });

        /* Set node dom element. */
        node = d3.selectAll(".node");

        /* Create d3-tip tooltips. */
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Name:</strong> <span style='color:#fa9b30'>" + d.name + "</span><br>" +
                    "<strong>Sub Analysis:</strong> <span style='color:#fa9b30'>" + d.subanalysis + "</span><br>" +
                    "<strong>Sub Analysis Id:</strong> <span style='color:#fa9b30'>" + d.parent.id + "</span><br>" +
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span><br>" +
                    "<strong>Row:</strong> <span style='color:#fa9b30'>" + d.row + "</span><br>" +
                    "<strong>Col:</strong> <span style='color:#fa9b30'>" + d.col + "</span><br>" +
                    "<strong>BCOrder:</strong> <span style='color:#fa9b30'>" + d.bcOrder + "</span>";
            });

        /* Invoke tooltip on dom element. */
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /* TODO: IN PROGRESS. */
    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     */
    var handleCollapseExpandAnalysis = function () {
        d3.selectAll(".analysis").on("dblclick", function () {
            var an = nodes[+d3.select(this).attr("id").replace(/(aId-)/g, "")];

            /* Expand. */
            if (!an.hidden) {
                d3.select(this).selectAll(".node").style("display", "inline");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "inline");
                });
                d3.select(this).select(".aNode").style("display", "none");

                /* Set node visibility. */
                an.hidden = true;
                an.children.forEach(function (n) {
                    n.hidden = false;
                });

                /* Set link visibility. */
                an.inputs.forEach(function (ain) {
                    nodeLinkPredMap[ain.id].forEach(function (l) {
                        d3.select("#linkId-" + links[l].id).style("display", "inline");
                        links[l].hidden = false;
                    });
                });

                an.inputs.forEach(function (n) {
                    updateNode(d3.select("#nodeId-" + n.id), n, n.x, n.y);
                    updateLink(d3.select("#nodeId-" + n.id), n, n.x, n.y);
                });

                an.outputs.forEach(function (n) {
                    updateNode(d3.select("#nodeId-" + n.id), n, n.x, n.y);
                    updateLink(d3.select("#nodeId-" + n.id), n, n.x, n.y);
                });
            } else {
                /* Collapse. */
                d3.select(this).selectAll(".node").style("display", "none");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "none");
                });
                d3.select(this).select(".aNode").style("display", "inline");

                /* Set node visibility. */
                an.hidden = false;
                an.children.forEach(function (n) {
                    n.hidden = true;
                });

                /* Set link visibility. */
                an.inputs.forEach(function (ain) {
                    nodeLinkPredMap[ain.id].forEach(function (l) {
                        d3.select("#linkId-" + links[l].id).style("display", "inline");
                        links[l].hidden = false;
                    });
                });

                updateNode(d3.select(this).select(".aNode"), an, an.x, an.y);
                updateLink(d3.select(this).select(".aNode"), an, an.x, an.y);
            }

        });
    };

    /**
     * Path highlighting.
     */
    var handlePathHighlighting = function () {
        d3.selectAll(".node").on("click", function (x) {

            if (d3.event.ctrlKey || d3.event.shiftKey) {
                var highlighted = true;

                /* Suppress after dragend. */
                if (d3.event.defaultPrevented) return;

                /* Clear any highlighting. */
                clearHighlighting();

                /* TODO: Create CSS-classes for highlighted cells to manipulate on highlighting. */
                if (d3.event.ctrlKey) {

                    /* Highlight path. */
                    highlightSuccPath(x.id, highlighted);
                } else if (d3.event.shiftKey) {

                    /* Highlight path. */
                    highlightPredPath(x.id, highlighted);
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
                return d.x - margin.left;
            }), d3.min(nodes, function (d) {
                return d.y - margin.top;
            })],
            max = [d3.max(nodes, function (d) {
                return d.x + margin.right;
            }), d3.max(nodes, function (d) {
                return d.y + margin.bottom;
            })],
            delta = [max[0] - min[0], max[1] - min[1]],
            factor = [(width / delta[0]), (height / delta[1])],
        /* Maximize scale to factor 3. */
            newScale = d3.min(factor.concat([3])),
            newPos = [((width - delta[0] * newScale) / 2),
                ((height - delta[1] * newScale) / 2)];

        newPos[0] -= min[0] * newScale;
        newPos[1] -= min[1] * newScale;

        if (transitionTime !== 0) {
            canvas
                .transition()
                .duration(1000)
                .attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        } else {
            canvas.attr("transform", "translate(" + newPos + ")scale(" + newScale + ")");
        }

        zoom.translate(newPos);
        zoom.scale(newScale);

        /* Background rectangle fix. */
        rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," + (-newPos[1] / newScale) + ")" + " scale(" + (+1 / newScale) + ")");
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
     */
    var drawGrid = function () {
        gridCell = canvas.append("g").classed({"cells": true}).selectAll(".cell")
            .data(function () {
                return [].concat.apply([], grid);
            })
            .enter().append("rect")
            .attr("x", function (d, i) {
                return -cell.width / 2 - parseInt(i / layoutWidth, 10) * cell.width;
            })
            .attr("y", function (d, i) {
                return -cell.height / 2 + (i % layoutWidth) * cell.height;
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
                return "cellId-" + parseInt(i / layoutWidth, 10) + "-" + (i % layoutWidth);
            });
    };

    /**
     * Draw simple node/link highlighting shapes.
     */
    var drawHighlightingShapes = function () {

        hLink = canvas.append("g").classed({"hLinks": true}).selectAll(".hLink")
            .data(links.filter(function (l) {
                return l !== null && typeof l !== "undefined";
            }))
            .enter().append("path")
            .attr("d", function (l) {
                var pathSegment = " M" + parseInt(nodes[l.source].x, 10) + "," + parseInt(nodes[l.source].y, 10);
                if (Math.abs(nodes[l.source].x - nodes[l.target].x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.source].x + (cell.width)) + "," + parseInt(nodes[l.target].y, 10) + " H" + parseInt(nodes[l.target].x, 10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.target].x, 10) + "," + parseInt(nodes[l.target].y, 10));
                }
                return pathSegment;
            })
            .classed({
                "hLink": true
            })
            .attr("id", function (l) {
                return "hLinkId-" + l.id;
            }).style("stroke", function (d) {
                return color(analysisWorkflowMap[nodes[d.target].analysis]);
            });


        hNode = canvas.append("g").classed({"hNodes": true}).selectAll(".hNode")
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
                return "hNodeId-" + d.id;
            }).style("fill", function (d) {
                return color(analysisWorkflowMap[d.analysis]);
            });
    };

    /**
     * Traverse graph back when the node has two or more predecessors.
     * @param n Current node.
     * @param subanalysis Current subanalysis.
     */
    var traverseBackSubanalysis = function (n, subanalysis) {
        n.subanalysis = subanalysis;
        nodePredMap[n.id].forEach(function (pn) {
            if (nodes[pn].subanalysis === null) {
                traverseBackSubanalysis(nodes[pn], subanalysis);
            }
        });
    };

    /**
     * Traverse graph in a DFS fashion.
     * @param n Current node.
     * @param subanalysis Current subanalysis.
     */
    var traverseDataset = function (n, subanalysis) {
        n.subanalysis = subanalysis;

        if (nodePredMap[n.id].length > 1) {
            nodePredMap[n.id].forEach(function (pn) {
                if (nodes[pn].subanalysis === null) {
                    traverseBackSubanalysis(nodes[pn], subanalysis);
                }
            });
        }

        if (typeof nodeSuccMap[n.id] !== "undefined") {
            nodeSuccMap[n.id].forEach(function (sn) {
                if (nodes[sn].analysis !== "dataset") {
                    if (nodes[sn].subanalysis === null) {
                        if (typeof nodeSuccMap[nodes[sn].id][0] !== "undefined") {
                            subanalysis = nodes[nodeSuccMap[nodes[sn].id][0]].subanalysis;
                        }
                    } else {
                        subanalysis = nodes[sn].subanalysis;
                    }
                }
                traverseDataset(nodes[sn], subanalysis);
            });
        }
    };

    /**
     * Divide analyses into independent subanalyses.
     */
    var markSubanalyses = function () {
        var subanalysis = 0;

        /* For each subanalysis in the dataset. */
        inputNodes.forEach(function (n) {
            if (n.subanalysis === null) {

                traverseDataset(n, subanalysis);
                subanalysis++;
            }
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
        handleCollapseExpandAnalysis();

        /* TODO: On click on node, enlarge shape to display more info. */
    };

    /**
     * Main d3 visualization function.
     */
    var drawGraph = function () {

        /* Short delay. */
        setTimeout(function () {

            /* Set coordinates for nodes. */
            assignCellCoords();

            /* Draw grid. */
            drawGrid();

            /* Draw simple node/link highlighting shapes. */
            drawHighlightingShapes();

            /* Draw links. */
            drawLinks();

            /* Create analysis group layers. */
            createAnalysisLayers();

            /* Draw nodes. */
            drawNodes();

            /* Create initial layout for sub-analysis only nodes. */
            initSubanalysisLayout();

            /* Draw sub-analysis nodes. */
            drawSubanalysisNodes();

            /* Create initial layout for analysis only nodes. */
            initAnalysisLayout();

            /* Draw analysis nodes. */
            drawAnalysisNodes();

            /* Set initial graph position. */
            fitGraphToWindow(0);

            /* Colorize graph. */
            dyeWorkflows();
            dyeAnalyses();

            /* Add dragging behavior to nodes. */
            applyDragBehavior();

            /* Add dragging behavior to analysis nodes. */
            applyAnalysisDragBehavior();

            /* Add dragging behavior to sub-analysis nodes. */
            applySubanalysisDragBehavior();

            /* Event listeners. */
            $('document').ready(function () {
                handleEvents();
            });

            /* Fade in. */
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

    /**
     * Refinery injection for the provenance visualization.
     * @param studyUuid The serialized unique identifier referencing a study.
     */
    var runProvenanceVisualizationPrivate = function (studyUuid) {
        var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0";

        /* Parse json. */
        d3.json(url, function (error, data) {

            /* Extract raw objects. */
            var obj = d3.entries(data)[1];

            /* Create node collection. */
            extractNodes(obj);

            /* Create link collection. */
            extractLinks();

            /* Extract analysis nodes. */
            createAnalysisNodes();

            /* Divide dataset and analyses into sub-analyses. */
            markSubanalyses();

            /* Set output nodes. */
            setOutputNodes();

            /* Create analyses and workflow hashes. */
            createWorkflowAnalysisMapping();

            /* Create analysis node mapping. */
            createAnalysisNodeMapping();

            /* Topological order. */
            var topNodes = sortTopological(outputNodes);

            if (topNodes !== null) {
                /* Assign layers. */
                assignLayers(topNodes);

                /* Add dummy nodes and links. */
                addDummyNodes();

                /* Recalculate layers including dummy nodes. */
                //topNodes = sortTopological(outputNodes);
                //assignLayers(topNodes);

                /* Group nodes by layer. */
                var layeredTopNodes = groupNodesByCol(topNodes);

                /* Place vertices. */
                computeLayout(layeredTopNodes);

                /* Restore original dataset. */
                removeDummyNodes();

                /* Create analysis node mapping. */
                //createAnalysisNodeMapping();

                /* Optimize layout. */
                postprocessLayout();

                /* Call d3 visualization. */
                drawGraph();
            } else {
                console.log("Error: Graph is not acyclic!");
            }
        });
    };

    /**
     * Publish module function.
     */
    return{
        runProvenanceVisualization: function (studyUuid) {
            runProvenanceVisualizationPrivate(studyUuid);
        }
    };
}();