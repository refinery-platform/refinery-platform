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
        aNodes = [];

    /* Initialize dom elements. */
    var node = Object.create(null),
        link = Object.create(null),
        analysis = Object.create(null),
        aNode = Object.create(null);

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
    var cell = {width: r * 3, height: r * 3};

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
        d3.selectAll(".node").each(function () {
            d3.select(this).classed({"highlightedNode": false});
        });
        d3.selectAll(".link").each(function () {
            d3.select(this).classed({"highlightedLink": false});
        });
    };

    /**
     * Get involved nodes for highlighting the path by the current node selection.
     * @param nodeId An Integer id for the node.
     * @param highlighted A Boolean flag whether path should be highlighted or not.
     */
    var highlightInvolvedPath = function (nodeId, highlighted) {

        /* For each predecessor. */
        nodePredMap[nodeId].forEach(function (p) {

            /* Get svg node element. */
            d3.select("#nodeId-" + p).classed({"highlightedNode": highlighted});

            /* Get svg link element. */
            nodeLinkPredMap[p].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            highlightInvolvedPath(p, highlighted);
        });
    };

    /**
     * Group nodes by layers into a 2d array.
     * @param tNodes Topological sorted nodes.
     * @returns {Array} Layer grouped array of nodes.
     */
    var groupNodesByCol = function (tNodes) {
        var layer = 0,
            cgtNodes = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(d));
        });

        cgtNodes.push([]);
        var k = 0;
        rtNodes.reverse().forEach(function (n) {
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

    /* TODO: Check all parameters. */
    /**
     * Deep copy node data structure.
     * @param node Node object.
     * @returns {{name: string, nodeType: string, fileType: string, uuid: string, study: string, assay: string, row: number, col: number, parents: Array, id: number, doiFactor: number, hidden: boolean, bcOrder: number}} Node object.
     */
    var copyNode = function (node) {
        var newNode = {name: "", nodeType: "", fileType: "", uuid: "", study: "", assay: "", row: -1, col: -1, parents: [], id: -1, doiFactor: -1, hidden: true, bcOrder: -1, x: 0, y: 0};

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

        return newNode;
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     */
    var initRowPlacement = function (lgNodes) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                nodes[n.id].row = i;
            });
        });
    };

    /* TODO: Code cleanup. */
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
                            accRows += (nodes[s].row + 1);
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
                if (i === 0) {
                    nodes[n.id].bcOrder = j + 1;
                    barycenterOrderedNodes[0][j] = nodes[n.id];

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
                nodes[n.id].row = k;
            });

        });

        return barycenterOrderedNodes;
    };

    /* TODO: Code cleanup. */
    /**
     * Remove edges that do not lead to an median neighbor.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var markCandidates = function (bclgNodes) {
        var l = 0;
        while (l < bclgNodes.length) {
            var i = 0;
            while (i < bclgNodes[l].length) {

                /* Mark links as neighbors:
                 the exact median if the length of successor nodes is odd,
                 else the middle two. */
                var succs = nodeLinkSuccMap[bclgNodes[l][i].id];
                if (succs.length !== 0) {
                    if (succs.length % 2 === 0) {
                        /* nodes[bclgNodes[l][i].id].neighbors = [parseInt(succs.length / 2 - 1, 10), parseInt(succs.length / 2, 10)]; */
                        links[succs[parseInt(succs.length / 2 - 1, 10)]].neighbor = true;
                        /* TODO: DEBUG: Revise second neighbor when even. */
                        /* links[succs[parseInt(succs.length / 2, 10)]].neighbor = true; */
                    } else {
                        /* nodes[bclgNodes[l][i].id].neighbors = [parseInt(succs.length / 2, 10)]; */
                        links[succs[parseInt(succs.length / 2, 10)]].neighbor = true;
                    }
                } else {
                    nodes[bclgNodes[l][i].id].neighbors = [];
                }
                i++;
            }
            l++;
        }
    };

    /* TODO: Code cleanup. */
    /* TODO: TESTING! */
    /**
     * Mark type 1 - and type 0 conflicts.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var markConflicts = function (bclgNodes) {

        var excludeSharedNodeLinks = function (value) {
            return links[value].type0 ? false : true;
        };

        var filterNeighbors = function (value) {
            return links[value].neighbor ? true : false;
        };

        var btSuccs = [],
            cSuccs = [];
        /* Backtracked successor links. */
        var backtrackCrossings = function () {
            btSuccs.forEach(function (bts) {
                /* Crossing. */
                if (nodes[links[bts].target].row > jMax) {
                    /* TODO: HINT: Possible type 2 conflict which should be resolved via barycenter heuristic already. */
                    links[bts].type1 = true;
                    links[bts].neighbor = true;
                }
            });
        };

        var markLayerToLayerCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var topMostPredRow = -1,
                topMostLink = -1;

            /* Get top most link. */
            cSuccs.forEach(function (s) {
                if (nodeLinkPredMap[links[s].target].length > 1) {
                    topMostPredRow = nodes[links[cSuccs[0]].source].row;
                    nodeLinkPredMap[links[s].target].forEach(function (pl) {
                        if (nodes[links[pl].target].nodeType !== "dummy" || nodes[links[pl].source].nodeType !== "dummy") {

                            /* Check top most link. */
                            if (nodes[links[pl].source].row < topMostPredRow) {
                                topMostPredRow = nodes[links[pl].source].row;
                                topMostLink = pl;
                            }
                        }
                    });
                }
            });

            /* Mark not top most links. */
            cSuccs.forEach(function (s) {
                if (nodeLinkPredMap[links[s].target].length > 1 && topMostLink !== -1) {
                    nodeLinkPredMap[links[s].target].forEach(function (pl) {
                        if (pl !== topMostLink) {
                            links[pl].type0 = true;
                            links[pl].neighbor = false;
                        }
                    });
                }
            });

            /* Update cSuccs. */
            cSuccs = cSuccs.filter(excludeSharedNodeLinks);

            /* Resolve crossings. */
            var curjMax = jMax;
            cSuccs.forEach(function (s) {
                if (nodes[links[s].target].row >= jMax) {
                    if (nodes[links[s].target].row > curjMax) {
                        curjMax = nodes[links[s].target].row;
                    }
                    /* Crossing. */
                } else {

                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be "removed". */
                    if (bclgNodes[l][i].nodeType !== "dummy" || nodes[links[s].target].nodeType !== "dummy") {
                        links[s].type1 = true;

                        /* If link is an inner segment, remove all non-inner segments before which are crossing it. */
                    } else {
                        /* Iterate back in current layer. */
                        var m = i;
                        for (m; m > 0; m--) {
                            if (m < i) {
                                /* Get successors for m */
                                btSuccs = nodeLinkSuccMap[bclgNodes[l][m].id].filter(filterNeighbors);
                                backtrackCrossings();
                            }
                        }

                    }
                }
            });
            jMax = curjMax;
        };

        /* Handle crossing conflicts (Type 0 and 1)*/
        var l = 1;
        while (l < bclgNodes.length) {
            var i = 0,
                j = 0,
                jMax = -1,
                iCur = -1;
            while (i < bclgNodes[l].length) {
                if (typeof bclgNodes[l][i] !== "undefined") {
                    iCur = i;

                    /* Crossing successor links. */
                    cSuccs = nodeLinkSuccMap[bclgNodes[l][i].id].filter(filterNeighbors);
                    markLayerToLayerCrossings();
                }
                i++;
            }
            l++;
        }
    };

    /**
     * Align each vertex with its chosen (left|right and upper/under) neighbor.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var verticalAlignment = function (bclgNodes) {
        markCandidates(bclgNodes);

        markConflicts(bclgNodes);
    };

    /**
     * After resolving conflicts, no crossings are left and connected paths are concatenated into blocks.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var formBlocks = function (bclgNodes) {

        /* Horizontal paths build blocks with its rightmost node being the root.
         * The root element does not own a neighbor link.
         * Every child - determined by the neighbor mark of links,
         * will be placed in the exact same row as its root. */

        var isBlockRoot = function (value) {
            return links[value].neighbor;
        };

        var filterNeighbor = function (value) {
            return links[value].neighbor ? true : false;
        };

        /* Iterate through graph layer by layer,
         * if node is root, iterate through block and place nodes into rows. */
        bclgNodes.forEach(function (lg) {
            lg.forEach(function (n, j) {
                var succs = nodeLinkSuccMap[nodes[n.id].id].filter(isBlockRoot);

                if (succs.length === 0) {
                    nodes[n.id].isBlockRoot = true;

                    /* Follow path through neighbors in predecessors and set row to root row. */
                    var rootRow = nodes[n.id].row,
                        curLink = -1,
                        curNode = n.id;

                    /* If root is not an output node, compute row. */
                    if (nodeLinkSuccMap[curNode].length !== 0) {
                        if (j === 0) {
                            rootRow = 0;
                        } else {
                            rootRow = lg[j - 1].row + 1;
                        }
                        nodes[curNode].row = rootRow;
                    }

                    /* Traverse. */
                    while (curLink !== -2) {
                        curLink = nodeLinkPredMap[curNode].filter(filterNeighbor);
                        if (curLink.length === 0) {
                            curLink = -2;
                        } else {
                            nodes[links[curLink[0]].source].row = rootRow;
                            curNode = links[curLink[0]].source;
                        }
                    }
                }
            });
        });
    };

    /**
     * Combine aligned nodes into blocks.
     * Partition blocks into classes.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var verticalCompaction = function (bclgNodes) {

        formBlocks(bclgNodes);
    };

    /* Code cleanup. */
    /**
     * Balance y-coordinates for each layer by median heuristic.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var balanceLayout = function (bclgNodes) {

        var traverseShift = function (rowStart, shiftAmount) {
            bclgNodes.forEach(function (lg, i) {
                lg.forEach(function (n, j) {
                    if (n.row >= rowStart) {
                        n.row += shiftAmount;
                    }
                });
            });
        };

        var sortNodesByRow = function (a, b) {
            if (typeof nodes[a] !== "undefined" && typeof nodes[b] !== "undefined") {
                return nodes[a].row - nodes[b].row;
            } else {
                return null;
            }
        };

        bclgNodes.forEach(function (lg) {
            lg.forEach(function (n) {

                /* Sort lookup maps first. */
                if (nodeSuccMap[n.id].length > 0)
                    nodeSuccMap[n.id].sort(sortNodesByRow);
                if (nodeLinkSuccMap[n.id].length > 0)
                    nodeLinkSuccMap[n.id].sort(sortNodesByRow);
                if (nodePredMap[n.id].length > 0)
                    nodePredMap[n.id].sort(sortNodesByRow);
                if (nodeLinkPredMap[n.id].length > 0)
                    nodeLinkPredMap[n.id].sort(sortNodesByRow);
            });
        });

        bclgNodes.forEach(function (lg, i) {
            lg.forEach(function (n, j) {
                var degree = 0,
                    min = 0,
                    max = 0,
                    rootRow;

                /* Split right. */
                if (nodeSuccMap[n.id].length > 1) {
                    degree = nodeSuccMap[n.id].length;
                    min = nodes[nodeSuccMap[n.id][0]].row;
                    max = nodes[nodeSuccMap[n.id][degree - 1]].row;
                    rootRow = min + (max - min) / 2;

                    /* If any node in the current layer is less than 1 unit near the new position
                     * add a new row and shift every node in all layers by one row. */

                    /* Check if shift is necessary for the current layer. */
                    var nearestDist = 1,
                        conflictRow = -1;
                    lg.forEach(function (cn, k) {
                        if (j !== k && Math.abs(cn.row - rootRow) < nearestDist) {
                            nearestDist = Math.abs(cn.row - rootRow);
                            conflictRow = cn.row;
                        }
                    });

                    if (conflictRow !== -1) {
                        traverseShift(rootRow, 1);
                    }
                    nodes[n.id].row = rootRow;
                }
                /* No split left. */
                if (nodePredMap[n.id].length === 1) {
                    var curNode = n.id;
                    rootRow = nodes[curNode].row;

                    while (nodePredMap[curNode].length === 1) {
                        nodes[curNode].row = rootRow;
                        curNode = nodePredMap[curNode][0];
                    }
                    if (nodePredMap[curNode].length === 0) {
                        nodes[curNode].row = rootRow;
                    }

                    /* TODO: Check paths near to the split and consider shifting. */
                    /* Split left. */
                } else if (nodePredMap[n.id].length > 1) {
                    degree = nodePredMap[n.id].length;
                    rootRow = n.row;

                    var step = 1,
                        initialStepEven = 0.5;

                    if (degree % 2 === 0) {
                        nodes[nodePredMap[n.id][degree / 2 - 1]].row = rootRow - initialStepEven;
                    } else {
                        nodes[nodePredMap[n.id][degree / 2]].row = rootRow;
                    }

                    var i = 0;
                    for (; i < degree; i++) {
                        if (degree % 2 === 0) {
                            if (i === degree / 2 - 1) {
                                nodes[nodePredMap[n.id][degree / 2 - 1]].row = rootRow - initialStepEven;
                            } else if (i === degree / 2) {
                                nodes[nodePredMap[n.id][degree / 2]].row = rootRow + initialStepEven;
                            } else {
                                if (i < degree / 2 - 1) {
                                    nodes[nodePredMap[n.id][i]].row = rootRow - step * (degree / 2 - i - initialStepEven);
                                } else {
                                    nodes[nodePredMap[n.id][i]].row = rootRow + step * (initialStepEven + i - degree / 2);
                                }
                            }
                        } else {
                            if (i === degree / 2) {
                                nodes[nodePredMap[n.id][degree / 2]].row = rootRow;
                            } else {
                                if (i < degree / 2) {
                                    nodes[nodePredMap[n.id][i]].row = rootRow - step * (degree / 2 - i - initialStepEven);
                                } else {
                                    nodes[nodePredMap[n.id][i]].row = rootRow + step * (initialStepEven + i - degree / 2);
                                }
                            }
                        }
                    }
                }
            });
        });
    };

    /* TODO: Vertical coordinate assignment. [Brandes and Köpf 2002] */
    /**
     * Set row placement for nodes in each layer. [Brandes and Köpf 2002]
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     */
    var verticalCoordAssignment = function (bclgNodes) {

        verticalAlignment(bclgNodes);

        verticalCompaction(bclgNodes);

        balanceLayout(bclgNodes);
    };

    /**
     * Layout node columns.
     * @param lgNodes Layer grouped array of nodes.
     */
    var placeNodes = function (lgNodes) {

        /* Init row placement. */
        initRowPlacement(lgNodes);

        /* Minimize edge crossings. */
        var bclgNodes = oneSidedCrossingMinimisation(lgNodes);

        /* Update row placements. */
        verticalCoordAssignment(bclgNodes);
    };

    /* TODO: Rewrite. */
    /**
     * Add dummy vertices.
     */
    var addDummyNodes = function () {
        links.forEach(function (l) {
            /* When the link is longer than one column, add dummy nodes. */
            var gapLength = nodes[l.target].col - nodes[l.source].col;

            if (gapLength > 1) {

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
                        col: curCol + 1,
                        id: newNodeId + i,
                        analysis: curAnalysis,
                        doiFactor: -1,
                        hidden: false
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
                nodeLinkPredMap[l.target] = nodeLinkPredMap[l.target].concat([newLinkId + j - 1]);
                nodeLinkPredMap[l.target].splice(nodeLinkPredMap[l.target].indexOf(l.id), 1);
                nodePredMap[l.target] = nodePredMap[l.target].concat([newNodeId + j - 2]);
                nodePredMap[l.target].splice(nodePredMap[l.target].indexOf(l.source), 1);

                /* Delete original link. */
                links[l.id] = null;
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
            rtNodes.push(copyNode(d));
        });

        rtNodes.reverse().forEach(function (n) {

            /* Get outgoing neighbor. */
            succ = nodeSuccMap[nodeMap[n.uuid]];

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

    /* TODO: Instead of copying nodes and deleting items from the collection, rewrite algorithm to only mark affected items. */
    /**
     * Linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting).
     * @param inputs Nodes which do not have any predecessing nodes.
     * @returns {*} If graph is acyclic, returns null; else returns topology sorted array of nodes.
     */
    var sortTopological = function (inputs) {
        var s = [], /* Input set. */
            l = [], /* Result set for sorted elements. */
            cNodes = [], /* Deep copy nodes, because we have to delete links from the graph. */
            n = Object.create(null);

        /* Deep copy arrays by value. */
        inputs.forEach(function (inNode) {
            s.push(copyNode(inNode));
        });
        nodes.forEach(function (selNode) {
            cNodes.push(copyNode(selNode));
        });

        /* To avoid definition of function in while loop below (added by NG). */
        /* For each successor. */
        var handleOutputNodes = function (m) {
            var index = -1;
            /* For each parent (predecessor), remove edge n->m. Delete parent with p.uuid == n.uuid. */
            cNodes[m].parents.forEach(function (p, i) {
                if (p == n.uuid) {
                    index = i;
                }
            });

            /* If parent of successor equals n, delete edge. */
            if (index > -1) {
                cNodes[m].parents.splice(index, 1);
            }

            /* If there are no edges left, insert m into s. */
            if (cNodes[m].parents.length === 0) {
                s.push(cNodes[m]);
            }
            /* Else, current successor has other parents to be processed first. */
        };

        /* While the input set is not empty. */
        while (s.length > 0) {

            /* Remove first item n. */
            n = s.shift();

            /* And push it into result set. */
            l.push(n);

            /* Get successor node set for n. */
            var succ = nodeSuccMap[nodeMap[n.uuid]];
            if (succ.length !== 0) {
                succ.forEach(handleOutputNodes);
            }
        }

        /* Handle non-acyclic graphs. */
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

                /* Set sucessor maps for output nodes to an empty array. */
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

                        /* ExtractLinkProperties. */
                        extractLinkProperties(n, linkId, j);

                        /* Build link hashes. */
                        createLinkHashes(p, linkId, i, srcNodeIds, srcLinkIds);
                        linkId++;
                    });
                    nodeLinkPredMap[i] = srcLinkIds;
                    nodePredMap[i] = srcNodeIds;
                } else {
                    console.log("Error: Parents array of node with uuid= " + n.uuid + " undefined!");
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
     * @param parentIndex Integer index of parrent array.
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
        aNodes.push({"uuid": "dataset", "row": -1, "col": -1, "hidden": true, "id": 0, "start": -1, "end": -1, "created": -1, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": [], "predAnalyses": [], "succAnalyses": []});

        analyses.objects.forEach(function (a, i) {
            aNodes.push({"uuid": a.uuid, "row": -1, "col": -1, "hidden": true, "id": i + 1, "start": a.time_start, "end": a.time_end, "created": a.creation_date, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": [], "predAnalyses": [], "succAnalyses": []});
        });
    };

    /**
     * Build link hashes.
     * @param parentNodeObj Predecessor node object.
     * @param linkId Integer identifier for the link.
     * @param nodeId Integer identifier for the node.
     * @param srcNodeIds Integer array containing all node identifiers predecessing the current node.
     * @param srcLinkIds Integer array containing all link identifiers incidenting the current node.
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
            col: -1,
            id: nodeId,
            analysis: (nodeObj.analysis_uuid !== null) ? nodeObj.analysis_uuid : "dataset",
            doiFactor: -1,
            hidden: false,
            bcOrder: -1,
            x: 0,
            y: 0
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

    /**
     * For each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it.
     */
    var createAnalysisNodeMapping = function () {
        nodes.forEach(function (n, i) {
            if (analysisNodeMap.hasOwnProperty(n.analysis)) {
                analysisNodeMap[n.analysis] = analysisNodeMap[n.analysis].concat([i]);
            } else {
                analysisNodeMap[n.analysis] = [i];
            }
        });

        aNodes.forEach(function (an) {

            /* Set nodes. */
            an.nodes = analysisNodeMap[an.uuid].map(function (d) {
                nodeAnalysisMap[d] = an.id;
                return nodes[d];
                /* flatten nodes objects. */
            });

            /* Set input nodes. */
            an.inputNodes = an.nodes.filter(function (n) {
                return nodePredMap[n.id].some(function (p) {
                    return nodes[p].analysis != an.uuid;
                }) || nodePredMap[n.id].length === 0;
                /* If no src analyses exists. */
            });

            /* Set output nodes. */
            an.outputNodes = an.nodes.filter(function (n) {
                return nodeSuccMap[n.id].length === 0 || nodeSuccMap[n.id].some(function (s) {
                    return nodes[s].analysis != an.uuid;
                });
            });
        });

        aNodes.forEach(function (an) {

            /* Set predecessor analyses. */
            if (an.uuid != "dataset") {
                an.inputNodes.forEach(function (n) {
                    nodePredMap[n.id].forEach(function (pn) {
                        if (an.predAnalyses.indexOf(nodeAnalysisMap[pn]) === -1) {
                            an.predAnalyses.push(nodeAnalysisMap[pn]);
                        }
                    });
                });
            }

            /* Set successor analyses. */
            an.outputNodes.forEach(function (n) {
                if (nodeSuccMap[n.id].length !== 0) {
                    nodeSuccMap[n.id].forEach(function (s) {
                        if (an.succAnalyses.indexOf(nodeAnalysisMap[s]) === -1 && nodeAnalysisMap[s] !== an.id) {
                            an.succAnalyses.push(nodeAnalysisMap[s]);
                        }
                    });
                }
            });
        });

        aNodes.forEach(function (an) {
            an.links = links.filter(function (l) {
                return l !== null && nodeAnalysisMap[l.target] == an.id;
            });
        });
    };

    /**
     * Extract workflows from analyses. A workflow might be executed by multiple analyses.
     */
    var createWorkflowAnalysisMapping = function () {
        analyses.objects.forEach(function (a) {

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
    var assignNodeGridCoordinates = function () {
        nodes.forEach(function (d) {
            d.x = - d.col * cell.width;
            d.y = d.row * cell.height;
        });
    };

    /**
     * Creates analysis group dom elements which then contain the nodes and links of an analysis.
     */
    var createAnalysisLayers = function () {
        var aId = 0;

        /* Add analyses dom groups. */
        aNodes.forEach(function () {
            canvas.append("g")
                .classed("analysis", true)
                .attr("id", function () {
                    return "aId-" + aId;
                });
            aId++;
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
     * Drag listener.
     * @param n Node object.
     */
    var dragging = function (n) {

        /* Drag selected node. */
        d3.select(this).attr("transform", function (d) {
            switch (d.nodeType) {
                case "dummy":
                case "raw":
                case "processed":
                    return "translate(" + d3.event.x + "," + d3.event.y + ")";
                case "special":
                    return "translate(" + (d3.event.x - r) + "," + (d3.event.y - r) + ")";
                case "dt":
                    return "translate(" + (d3.event.x - r * 0.75) + "," + (d3.event.y - r * 0.75) + ")";
            }
        });

        /* Drag adjacent links. */
        /* Get input links and update coordinates for x2 and y2. */
        nodeLinkPredMap[n.id].forEach(function (l) {
            d3.select("#linkId-" + l).attr("d", function (l) {
                var pathSegment = " M" + parseInt(nodes[l.source].x,10) + "," + parseInt(nodes[l.source].y,10);
                if (Math.abs(nodes[l.source].x - nodes[l.target].x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.source].x + (cell.width)) + "," + parseInt(d3.event.y,10) + " L" + parseInt(d3.event.x,10) + "," + parseInt(d3.event.y,10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(d3.event.x,10) + "," + parseInt(d3.event.y,10));
                }
                return pathSegment;
            });
        });

        /* Get output links and update coordinates for x1 and y1. */
        nodeLinkSuccMap[n.id].forEach(function (l) {
            d3.select("#linkId-" + l).attr("d", function (l) {
                var pathSegment = " M" + parseInt(d3.event.x,10) + "," + parseInt(d3.event.y,10);
                if (Math.abs(d3.event.x - nodes[l.target].x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(d3.event.x+cell.width,10) +"," + parseInt(nodes[l.target].y,10) + " L" + parseInt(nodes[l.target].x,10) + " " + parseInt(nodes[l.target].y,10));
                } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.target].x,10) + "," + parseInt(nodes[l.target].y,10));
                }
                return pathSegment;
            });
        });

        /* Update data. */
        n.x = d3.event.x;
        n.y = d3.event.y;
    };

    /**
     * Drag end listener.
     */
    var dragEnd = function () {
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
     * Drag start listener support for nodes.
     */
    var analysisDragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    /**
     * Dragging listener.
     * @param an Analysis node.
     */
    var analysisDragging = function (an) {

        /* Drag selected node. */
        d3.select(this).attr("transform", function () {
            return "translate(" + d3.event.x + "," + d3.event.y + ")";
        });

        /* Update incident dom link elements. */
        an.predAnalyses.forEach(function (pan) {
            aNodes[pan].outputNodes.forEach(function (n) {
                if (nodeLinkSuccMap[n.id].length !== 0) {
                    nodeLinkSuccMap[n.id].forEach(function (l) {
                        if (nodeAnalysisMap[links[l].target] == an.id) {
                            d3.select("#linkId-" + l).attr("x2", d3.event.x);
                            d3.select("#linkId-" + l).attr("y2", d3.event.y);
                        }
                    });
                }
            });
        });

        /* Update non-incident dom link elements. */
        an.succAnalyses.forEach(function (san) {
            aNodes[san].inputNodes.forEach(function (n) {
                nodeLinkPredMap[n.id].forEach(function (l) {
                    if (nodeAnalysisMap[links[l].source] === an.id) {
                        d3.select("#linkId-" + l).attr("x1", d3.event.x);
                        d3.select("#linkId-" + l).attr("y1", d3.event.y);
                    }
                });
            });
        });

        /* Update data. */
        an.x = d3.event.x;
        an.y = d3.event.y;
    };

    /**
     * Drag end listener.
     */
    var analysisDragEnd = function () {
    };

    /**
     * Sets the drag events for analysis nodes.
     */
    var applyAnalysisDragBehavior = function () {

        /* Drag and drop node enabled. */
        var analysisDrag = d3.behavior.drag()
            .on("dragstart", analysisDragStart)
            .on("drag", analysisDragging)
            .on("dragend", analysisDragEnd);

        /* Invoke dragging behavior on nodes. */
        d3.selectAll(".aNode").call(analysisDrag);
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

    /* TODO: Recompute layout as if analysis were a single node and transition nodes/links.
     */
    /**
     * Create initial layout for analysis only nodes.
     */
    var initAnalysisLayout = function () {
        aNodes.forEach(function (an) {
            /* Exclude dummy nodes and center analysis to barycenter columns. */
            var childNodes = an.nodes.filter(function (n) {
                return n.nodeType !== "dummy" ? true : false;
            });

            var accRows = 0;

            childNodes.forEach(function (n) {
                accRows += n.row;
            });

            var rootCol;

            if (an.succAnalyses.length > 0) {
                    rootCol = aNodes[an.succAnalyses[0]].inputNodes[0].col;
                an.succAnalyses.forEach( function (san) {
                    aNodes[san].inputNodes.forEach( function (sanIn) {
                        if (sanIn.col + 1 > rootCol) {
                            rootCol = sanIn.col + 1;
                        }
                    });
                });
            } else {
                if (an.outputNodes.length > 0) {
                    rootCol = an.outputNodes[0].col;
                } else {
                    /* TODO: Magic number for starting layer. */
                    an.col = 0;
                }
            }

            an.col = rootCol;

            an.x = -an.col * cell.width;
            an.y = (accRows / childNodes.length) * cell.height;
        });
    };

    /**
     * Set display property of analysis connecting links.
     */
    var initLinkVisibility = function () {
        aNodes.forEach(function (an) {
            an.predAnalyses.forEach(function (pan) {
                aNodes[pan].outputNodes.forEach(function (n) {
                    if (nodeLinkSuccMap[n.id].length !== 0) {
                        nodeLinkSuccMap[n.id].forEach(function (l) {
                            if (nodeAnalysisMap[links[l].target] == an.id) {
                                links[l].hidden = false;
                            }
                        });
                    }
                });
            });
        });
    };

    /**
     * Draw links.
     */
    var drawLinks = function () {
        link = canvas.selectAll(".link")
            .data(links.filter(function (l) {
                return l !== null;
            }))
            .enter().append("path")
            .attr("d", function (l) {
                 var pathSegment = " M" + parseInt(nodes[l.source].x,10) + "," + parseInt(nodes[l.source].y,10);
                 if (Math.abs(nodes[l.source].x - nodes[l.target].x) > cell.width) {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.source].x + (cell.width)) + "," + parseInt(nodes[l.target].y,10) + " H" + parseInt(nodes[l.target].x,10));
                 } else {
                    pathSegment = pathSegment.concat(" L" + parseInt(nodes[l.target].x,10) + "," + parseInt(nodes[l.target].y,10));
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
     * Draw analysis nodes.
     */
    var drawAnalysisNodes = function () {
        analysis.each(function (d, i) {
            d3.select(this).selectAll(".aNode")
                .data(aNodes.filter(function (an) {
                    return an.id == i;
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
                return d.id === 0 ? "<span style='color:#fa9b30'>Original Dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                        "<strong>Start:</strong> <span style='color:#fa9b30'>" + d.start + "</span><br>" +
                        "<strong>End:</strong> <span style='color:#fa9b30'>" + d.end + "</span>";
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
                    return nodeAnalysisMap[n.id] == i;
                }))
                .enter().append("g").style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                }).each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", r);
                    } else if (d.nodeType === "dummy") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", 0.75);
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
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span>";
            });

        /* Invoke tooltip on dom element. */
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    /* TODO: Code cleanup. */
    /**
     * Sets the visibility of links and (a)nodes when collapsing or expanding analyses.
     */
    var handleCollapseExpandAnalysis = function () {
        d3.selectAll(".analysis").on("dblclick", function () {
            var an = aNodes[+d3.select(this).attr("id").replace(/(aId-)/g, "")];

            /* Expand. */
            if (!an.hidden) {
                d3.select(this).selectAll(".node").style("display", "inline");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "inline");
                });
                d3.select(this).select(".aNode").style("display", "none");

                /* Set node visibility. */
                an.hidden = true;
                an.nodes.forEach(function (n) {
                    n.hidden = false;
                });

                /* Adapt incoming links. */
                an.predAnalyses.forEach(function (pan) {
                    aNodes[pan].outputNodes.forEach(function (n) {
                        if (nodeLinkSuccMap[n.id].length !== 0) {
                            nodeLinkSuccMap[n.id].forEach(function (l) {
                                if (nodeAnalysisMap[links[l].target] == an.id) {
                                    d3.select("#linkId-" + l).style("display", "inline")
                                        .attr("x2", nodes[links[l].target].x)
                                        .attr("y2", nodes[links[l].target].y);
                                }
                            });
                        }
                    });
                });

                /* Adapt outgoing links. */
                an.succAnalyses.forEach(function (san) {
                    aNodes[san].inputNodes.forEach(function (n) {
                        nodeLinkPredMap[n.id].forEach(function (l) {
                            if (nodeAnalysisMap[links[l].source] == an.id) {
                                d3.select("#linkId-" + l).style("display", "inline")
                                    .attr("x1", nodes[links[l].source].x)
                                    .attr("y1", nodes[links[l].source].y);
                            }
                        });
                    });
                });

                /* Collapse. */
            } else {
                d3.select(this).selectAll(".node").style("display", "none");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "none");
                });
                d3.select(this).select(".aNode").style("display", "inline");

                /* Set node visibility. */
                an.hidden = false;
                an.nodes.forEach(function (n) {
                    n.hidden = true;
                });

                /* Adapt incoming links. */
                an.predAnalyses.forEach(function (pan) {
                    aNodes[pan].outputNodes.forEach(function (n) {
                        if (nodeLinkSuccMap[n.id].length !== 0) {
                            nodeLinkSuccMap[n.id].forEach(function (l) {
                                if (nodeAnalysisMap[links[l].target] == an.id) {
                                    d3.select("#linkId-" + l).style("display", "inline")
                                        .attr("x2", an.x)
                                        .attr("y2", an.y);
                                }
                            });
                        }
                    });
                });

                /* Adapt outgoing links. */
                an.succAnalyses.forEach(function (san) {
                    aNodes[san].inputNodes.forEach(function (n) {
                        nodeLinkPredMap[n.id].forEach(function (l) {
                            if (nodeAnalysisMap[links[l].source] == an.id) {
                                d3.select("#linkId-" + l).style("display", "inline");
                                d3.select("#linkId-" + l)
                                    .attr("x1", an.x)
                                    .attr("y1", an.y);
                            }
                        });
                    });
                });
            }
        });
    };

    /**
     * Path highlighting.
     */
    var handlePathHighlighting = function () {
        d3.selectAll(".node").on("click", function (x) {
            var highlighted = true;

            /* Suppress after dragend. */
            if (d3.event.defaultPrevented) return;

            /* Clear any highlighting. */
            clearHighlighting();

            /* Highlight selected node and links. */
            d3.select(this).classed({"highlightedNode": true});
            nodeLinkPredMap[x.id].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            /* Highlight path. */
            highlightInvolvedPath(x.id, highlighted);
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
            newScale = d3.min(factor),
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
        d3.select(".brect").on("click", function () {

            /* Suppress after drag end. */
            if (d3.event.defaultPrevented) return;

            /* If double click, break. */
            if (clickInProgress) {
                return;
            }
            clickInProgress = true;

            /* Single click event is called after timeout unless a dblick action is performed. */
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
        d3.select(".brect").on("dblclick", function () {
            bRectAction = handleFitGraphToWindow;
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

        /* Handle analysis aggregation. */
        handleCollapseExpandAnalysis();
    };

    /**
     * Main d3 visualization function.
     */
    var drawGraph = function () {

        /* Short delay. */
        setTimeout(function () {

            /* Set coordinates for nodes. */
            assignNodeGridCoordinates();

            /* Create initial layout for analysis only nodes. */
            initAnalysisLayout();

            /* Draw links. */
            drawLinks();

            /* Create analysis group layers. */
            createAnalysisLayers();

            /* Draw nodes. */
            drawNodes();

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

            /* Event listeners. */
            handleEvents();

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

            /* Set output nodes. */
            setOutputNodes();

            /* Create analyses and workflow hashes. */
            createWorkflowAnalysisMapping();

            /* Extract analysis nodes. */
            createAnalysisNodes();

            /* Topological order. */
            var topNodes = sortTopological(inputNodes);

            if (topNodes !== null) {
                /* Assign layers. */
                assignLayers(topNodes);

                /* Add dummy nodes and links. */
                addDummyNodes();

                /* Recalculate layers including dummy nodes. */
                topNodes = sortTopological(inputNodes);
                assignLayers(topNodes);

                /* Create analysis node mapping. */
                createAnalysisNodeMapping();

                /* Set display property of analysis connecting links. */
                /* initLinkVisibility(); */

                /* Group nodes by layer. */
                var layeredTopNodes = groupNodesByCol(topNodes);

                /* Place vertices. */
                placeNodes(layeredTopNodes);

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