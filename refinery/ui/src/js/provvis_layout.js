/**
 * Module for layout.
 */
var provvisLayout = function () {

    /* Restore dummy path link. */
    var dummyPaths = [];

    /* The layout is processed from the left (beginning at column/layer 0) to the right. */
    var firstLayer = 0,
        width = 0,
        depth = 0,
        grid = [];

    var nodes = [],
        links = [],
        iNodes = [],
        oNodes = [],
        aNodes = [],
        saNodes = [],

        nodePredMap = [],
        nodeSuccMap = [],
        nodeLinkPredMap = [],
        nodeLinkSuccMap = [];

    /**
     * Deep copy node data structure.
     * @param node Node object.
     * @returns {{name: string, nodeType: string, fileType: string, uuid: string, study: string, assay: string, row: number, col: number, parents: Array, id: number, doi: number, hidden: boolean, bcOrder: number, x: number, y: number, rowBK: {left: number, right: number}, isBlockRoot: boolean, subanalysis: number, parent: {}}}
     */
    var copyNode = function (node) {
        var newNode = {name: "", nodeType: "", fileType: "", uuid: "", study: "", assay: "", row: -1, col: -1, parents: [], id: -1, doi: -1, hidden: true, bcOrder: -1, x: 0, y: 0, rowBK: {left: -1, right: -1}, isBlockRoot: false, subanalysis: -1, parent: {}};

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
        newNode.doi = node.doi;
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
     * Maps the column/row index to nodes.
     */
    var createNodeGrid = function () {
        for (var i = 0; i < depth; i++) {
            grid.push([]);
            for (var j = 0; j < width; j++) {
                grid[i].push([]);
                grid[i][j] = "undefined";
            }
        }

        nodes.forEach(function (n) {
            grid[n.col][n.row] = n.id;
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
                nodes[n.id].rowBK.right = depth - lg.length + i;
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
                nodes[n.id].rowBK.right = width - barycenterOrderedNodes[i].length + k;
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
                        links[succs[parseInt(succs.length / 2 - 1, 10)]].l.neighbor = true;
                    }
                    links[succs[parseInt(succs.length / 2, 10)]].l.neighbor = true;
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
            return links[value].l.type0 ? false : true;
        };

        var filterNeighbors = function (value) {
            return links[value].l.neighbor ? true : false;
        };

        var btUpSuccs = [],
            upSuccs = [];

        /* Backtracked upper successor links. */
        var backtrackUpCrossings = function () {
            btUpSuccs.forEach(function (bts) {
                /* Crossing. */
                if (links[bts].target.rowBK.left > jMax) {
                    links[bts].l.type1 = true;
                    links[bts].l.neighbor = true;
                }
            });
        };

        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var leftMostPredRow = -1,
                leftMostLink = -1;

            /* Get left most link. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target.id].length > 1) {
                    leftMostPredRow = links[upSuccs[0]].source.rowBK.left;
                    nodeLinkPredMap[links[ups].target.id].forEach(function (pl) {
                        if (links[pl].target.nodeType !== "dummy" || links[pl].source.nodeType !== "dummy") {

                            /* Check top most link. */
                            if (links[pl].source.rowBK.left < leftMostPredRow) {
                                leftMostPredRow = links[pl].source.rowBK.left;
                                leftMostLink = pl;
                            }
                        }
                    });
                }
            });

            /* Mark all but left most links. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target.id].length > 1 && leftMostLink !== -1) {
                    nodeLinkPredMap[links[ups].target.id].forEach(function (pl) {
                        if (pl !== leftMostLink) {
                            links[pl].l.type0 = true;
                            links[pl].l.neighbor = false;
                        }
                    });
                }
            });

            /* Update upSuccs. */
            upSuccs = upSuccs.filter(excludeUpSharedNodeLinks);

            /* Resolve crossings. */
            var curjMax = jMax;
            upSuccs.forEach(function (ups) {
                if (links[ups].target.rowBK.left >= jMax) {
                    if (links[ups].target.rowBK.left > curjMax) {
                        curjMax = links[ups].target.row;
                    }
                    /* Crossing. */
                } else {
                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be "removed". */
                    if (bclgNodes[upl][i].nodeType !== "dummy" || links[ups].target.nodeType !== "dummy") {
                        links[ups].l.type1 = true;

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
            return links[value].l.type0 ? false : true;
        };

        var filterNeighbors = function (value) {
            return links[value].l.neighbor ? true : false;
        };

        var btUpSuccs = [],
            upSuccs = [];

        /* Backtracked upper successor links. */
        var backtrackUpCrossings = function () {
            btUpSuccs.forEach(function (bts) {
                /* Crossing. */
                if (links[bts].target.rowBK.right > jMax) {
                    links[bts].l.type1 = true;
                    links[bts].l.neighbor = true;
                }
            });
        };


        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var rightMostPredRow = -1,
                rightMostLink = -1;

            /* Get right most link. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target.id].length > 1) {
                    rightMostPredRow = links[upSuccs[0]].source.rowBK.right;
                    nodeLinkPredMap[links[ups].target.id].forEach(function (pl) {
                        if (links[pl].target.nodeType !== "dummy" || links[pl].source.nodeType !== "dummy") {

                            /* Check right most link. */
                            if (links[pl].source.rowBK.right > rightMostPredRow) {
                                rightMostPredRow = links[pl].source.rowBK.right;
                                rightMostLink = pl;
                            }
                        }
                    });
                }
            });

            /* Mark all but right most links. */
            upSuccs.forEach(function (ups) {
                if (nodeLinkPredMap[links[ups].target.id].length > 1 && rightMostLink !== -1) {
                    nodeLinkPredMap[links[ups].target.id].forEach(function (pl) {
                        if (pl !== rightMostLink) {
                            links[pl].l.type0 = true;
                            links[pl].l.neighbor = false;
                        }
                    });
                }
            });

            /* Update upSuccs. */
            upSuccs = upSuccs.filter(excludeUpSharedNodeLinks);

            /* Resolve crossings. */
            var curjMax = jMax;
            upSuccs.forEach(function (ups) {
                if (links[ups].target.rowBK.right <= jMax) {
                    if (links[ups].target.rowBK.right < curjMax) {
                        curjMax = links[ups].target.rowBK.right;
                    }
                    /* Crossing. */
                } else {

                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be "removed". */
                    if (bclgNodes[upl][i].nodeType !== "dummy" || links[ups].target.nodeType !== "dummy") {
                        links[ups].l.type1 = true;

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
        links.forEach(function (l) {
            l.l.type0 = false;
            l.l.type1 = false;
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
            return links[value].l.neighbor;
        };

        var filterNeighbor = function (value) {
            return links[value].l.neighbor ? true : false;
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
                        curNodeId = bclgNodes[l][i].id;

                    /* Traverse. */
                    while (curLink !== -2) {
                        curLink = nodeLinkPredMap[curNodeId].filter(filterNeighbor);
                        if (curLink.length === 0) {
                            curLink = -2;
                        } else {
                            /* Greedy choice for Neighbor when there exist two. */
                            if (alignment === "left") {
                                links[curLink[0]].source.rowBK.left = rootRow;
                                curNodeId = links[curLink[0]].source.id;
                            } else {
                                links[curLink[curLink.length - 1]].source.rowBK.right = rootRow;
                                curNodeId = links[curLink[curLink.length - 1]].source.id;
                            }
                        }
                    }
                }
            }
        }
    };

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
        width = d3.max(lgNodes, function (lg) {
            return lg.length;
        });

        depth = lgNodes.length;
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
            var gapLength = Math.abs(l.source.col - l.target.col);

            if (gapLength > 1) {

                dummyPaths.push({
                    id: l.id,
                    source: ({
                        id: l.source.id,
                        predNodes: nodePredMap[l.source.id].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: nodeLinkPredMap[l.source.id].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: nodeSuccMap[l.source.id].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: nodeLinkSuccMap[l.source.id].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        })
                    }),
                    target: ({
                        id: l.target.id,
                        predNodes: nodePredMap[l.target.id].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: nodeLinkPredMap[l.target.id].filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: nodeSuccMap[l.target.id].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: nodeLinkSuccMap[l.target.id].filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        })
                    }),
                    parents: l.target.parents.filter(function (p) {
                        return p;
                    })
                });

                /* Dummy nodes are affiliated with the source node of the link in context. */
                var newNodeId = nodes.length,
                    newLinkId = links.length,
                    predNodeId = l.source.id,
                    curCol = l.source.col,
                    curAnalysis = l.source.analysis,
                    curStudy = l.source.study,
                    curAssay = l.source.assay,
                    curParent = l.target.parent,
                    curSubanalysis = l.target.subanalysis;

                /* Insert nodes. */
                var i = 0;
                while (i < gapLength - 1) {

                    /* Add node. */
                    nodes.push(new provvisDecl.Node(newNodeId + i, "dummy", [], [], Object.create(null), [], -1,
                        false, curCol + 1, -1, -1, -1, "dummyNode-" + (newNodeId + i), "dummy", curStudy, curAssay,
                        (i === 0) ? [l.source.uuid] : ["dummyNode-" + predNodeId], curAnalysis, curSubanalysis,
                            "dummyNode-" + (newNodeId + i), {left: -1, right: -1}, -1, false));

                    predNodeId = newNodeId + i;
                    curCol++;
                    i++;
                }

                /* Update parents for original target node. */
                l.target.parents = l.target.parents.concat([nodes[predNodeId].uuid]);
                l.target.parents.splice(l.target.parents.indexOf(l.source.uuid), 1);

                /* Insert links (one link more than nodes). */
                predNodeId = l.source.id;
                curCol = l.source.col;

                /* Update original link source. */
                nodeLinkSuccMap[l.source.id] = nodeLinkSuccMap[l.source.id].concat([newLinkId]);
                nodeLinkSuccMap[l.source.id].splice(nodeLinkSuccMap[l.source.id].indexOf(l.id), 1);
                nodeSuccMap[l.source.id] = nodeSuccMap[l.source.id].concat([newNodeId]);
                nodeSuccMap[l.source.id].splice(nodeSuccMap[l.source.id].indexOf(l.target.id), 1);

                /* Insert links. */
                var j = 0;
                while (j < gapLength) {

                    /* Add link. */
                    links.push(new provvisDecl.Link(newLinkId + j, nodes[predNodeId],
                        (j === gapLength - 1) ? l.target : nodes[newNodeId + j], false,
                        {neighbor: false, type0: false, type1: false}));

                    /* Update link maps. */
                    if (j < gapLength - 1) {
                        nodePredMap[newNodeId + j] = [predNodeId];
                        nodeLinkPredMap[newNodeId + j] = [newLinkId + j];
                        nodeLinkSuccMap[newNodeId + j] = [newLinkId + j + 1];
                    }

                    /* Update nodes before target. */
                    if (j < gapLength - 2) {
                        nodeSuccMap[newNodeId + j] = [newNodeId + j + 1];
                    } else if (j === gapLength - 2) {
                        nodeSuccMap[newNodeId + j] = [l.target.id];
                    }

                    predNodeId = newNodeId + j;
                    curCol++;
                    j++;
                }
                /* Update original link target. */
                nodeLinkPredMap[l.target.id] = nodeLinkPredMap[l.target.id].concat([newLinkId + j - 1]);
                nodeLinkPredMap[l.target.id].splice(nodeLinkPredMap[l.target.id].indexOf(l.id), 1);
                nodePredMap[l.target.id] = nodePredMap[l.target.id].concat([newNodeId + j - 2]);
                nodePredMap[l.target.id].splice(nodePredMap[l.target.id].indexOf(l.source.id), 1);

                /* Deleting the original link is not necessary as the mappings were removed. */
                /* links[l.id] = null; */
            }
        });
    };

    /**
     * Assign layers.
     * @param tsNodes Topology sorted array of nodes.
     */
    var assignLayers = function (tsNodes) {
        var layer = 0,
            succs = [];

        tsNodes.forEach(function (n) {

            /* Get outgoing neighbor. */
            succs = nodeSuccMap[n.id];

            if (succs.length === 0) {
                nodes[n.id].col = layer;
            } else {
                var minSuccLayer = layer;
                succs.forEach(function (s) {
                    if (nodes[s].col > minSuccLayer) {
                        minSuccLayer = nodes[s].col;
                    }
                });
                nodes[n.id].col = minSuccLayer + 1;
            }
        });
    };

    /* TODO: Revise topsort. */
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

    /* TODO: PROTOTYPE: Code cleanup. */
    /**
     * Sort output nodes by sub-analysis and analysis.
     * Secondly, the distance for every pair of analyses (which are part of the graphs outputnodes) are computed
     * and prioritized to be aligned together in the most-right and fixed layer of the graph.
     * @returns {Array} The sorted array of output nodes.
     */
    var sortOutputNodes = function () {

        /* Sort output nodes. */
        oNodes.sort(function (a, b) {
            return b.parent.id - a.parent.id;
        });

        /* Set analyses as output analyses. */
        oNodes.forEach(function (n) {
            /* Set sub-analysis as output. */
            n.parent.isOutputAnalysis = true;
        });


        var dist = [],
            clusters = [],
            priorities = [],
            sortedoNodes = [];

        /* Initialize n x n distance, cluster and priority matrix. */
        saNodes.forEach(function (san, i) {
            dist.push([]);
            clusters.push([]);
            priorities.push([]);
            saNodes.forEach(function (sanj, j) {
                dist[i][j] = -1;
                clusters[i][j] = 0;
            });
        });

        var curDist = 0,
            curSa = Object.create(null),
            origSa = Object.create(null);


        var foundNeighbor = function (sa) {
            if (sa.isOutputAnalysis) {
                var i = saNodes.indexOf(origSa),
                    j = saNodes.indexOf(sa);

                if (curDist < dist[i][j] || dist[i][j] === -1) {
                    dist[i][j] = curDist;
                }
            }
        };

        /* Traverse in successor direction. */
        var traverseFront = function (sa) {
            foundNeighbor(sa);
            curDist++;
            sa.succs.forEach(traverseFront);
            curDist--;
        };

        /* Traverse in predecessor direction. */
        var traverseBack = function (sa) {
            foundNeighbor(sa);

            // traverse front
            var succs = sa.succs.filter(function (ssa) {
                return ssa.id !== curSa.id;
            });
            curSa = sa;
            curDist++;
            succs.forEach(function (ssa) {
                traverseFront(ssa);
            });
            sa.preds.forEach(function (psa) {
                traverseBack(psa);
            });
            curDist--;
        };

        /* Each output subanalysis then has its path length to another output sub-analysis. */
        var getNeighbors = function (ar, i) {
            var curMin = d3.max(ar),
                indices = [];
            ar.forEach(function (v, j) {
                if (v !== -1 && i !== j) {
                    if (v < curMin) {
                        curMin = v;
                        indices = [];
                        indices.push(j);
                    } else if (v === curMin) {
                        indices.push(j);
                    }
                }
            });
            return indices;
        };

        /* For each neighbors of an output sub-analysis, cluster them with the connecting output subanalyses. */
        var computeClusters = function () {
            saNodes.filter(function (d) {
                return d.isOutputAnalysis;
            }).forEach(function (sa) {
                var neighbors = getNeighbors(dist[saNodes.indexOf(sa)], saNodes.indexOf(sa));
                neighbors.forEach(function (j) {
                    var i = saNodes.indexOf(sa);
                    clusters[i][j]++;
                    //clusters[j][i]++;
                });
            });
        };

        /* Every output sub-analysis has its nearest neighbors. */
        var setPriorities = function () {
            var setSa = function (sa, i, j) {
                clusters[i].forEach(function (d, k) {
                    if (d === j && sa !== saNodes[k]) {
                        priorities[i].push(saNodes[k].id);
                    }
                });
            };
            saNodes.forEach(function (sa, i) {
                for (var j = d3.max(clusters[i]); j > 0; j--) {
                    setSa(sa, i, j);
                }
            });
        };

        /* Iterate over output sub-analysis and insert it directly after its nearest neighbor.*/
        var insertSorted = function (ar, sa) {
            var tail = [];
            var bla = "";
            ar.forEach(function (d) {
                bla = bla + " " + d.id;
            });
            var found = false,
                cutIndex = 0;
            for (var i = 0; i < priorities.length && !found; i++) {
                var p = priorities[saNodes.indexOf(sa)][i];
                for (var j = 0; j < ar.length && !found; j++) {
                    var d = ar[j];
                    if (d.parent.id === p) {
                        found = true;
                        cutIndex = j;
                    }
                }
            }

            if (!found) {
                ar.push.apply(ar, sa.outputs);
            } else {
                tail = ar.splice(cutIndex, ar.length - cutIndex);
                ar.push.apply(ar, sa.outputs);
                ar.push.apply(ar, tail);
            }
        };

        /* Traverse back and forth to find distance with path hops between sub-analyses. */
        var findConnections = function () {
            saNodes.forEach(function (sani) {
                curDist++;
                curSa = sani;
                origSa = sani;
                sani.preds.forEach(function (psa) {
                    traverseBack(psa);
                });
                sani.succs.forEach(function (ssa) {
                    traverseFront(ssa);
                });
                curDist--;
            });
        };

        var reorderOutputNodes = function () {
            /* Set dataset sub-analyses without any successor analyses. */
            saNodes.filter(function (sa) {
                return sa.isOutputAnalysis;
            }).filter(function (sa) {
                return getNeighbors(dist[saNodes.indexOf(sa)], saNodes.indexOf(sa)).length === 0;
            }).forEach(function (sa) {
                sortedoNodes.push.apply(sortedoNodes, sa.outputs);
            });

            /* Set remaining clusters. */
            saNodes.filter(function (sa) {
                return sa.isOutputAnalysis;
            }).filter(function (sa) {
                return getNeighbors(dist[saNodes.indexOf(sa)], saNodes.indexOf(sa)).length !== 0;
            }).forEach(function (sa) {

                insertSorted(sortedoNodes, sa);
            });
        };

        findConnections();
        computeClusters();
        setPriorities();
        reorderOutputNodes();

        return sortedoNodes;
    };

    /**
     * Restore links where dummy nodes were inserted in order to process the layout.
     */
    var removeDummyNodes = function () {
        /* Clean up links. */
        for (var i = 0; i < links.length; i++) {
            var l = links[i];

            /* Clean source. */
            if (l.source.nodeType != "dummy" && l.target.nodeType == "dummy") {
                nodeSuccMap[l.source.id].splice(nodeSuccMap[l.source.id].indexOf(l.target.id), 1);
                nodeLinkSuccMap[l.source.id].splice(nodeLinkSuccMap[l.source.id].indexOf(l.id), 1);
                links.splice(i, 1);
                i--;
            }
            /* Clean target. */
            else if (l.source.nodeType == "dummy" && l.target.nodeType != "dummy") {
                l.target.parents.splice(l.target.parents.indexOf(l.source.uuid), 1);
                nodePredMap[l.target.id].splice(nodePredMap[l.target.id].indexOf(l.source.id), 1);
                nodeLinkPredMap[l.target.id].splice(nodeLinkPredMap[l.target.id].indexOf(l.id), 1);
                links.splice(i, 1);
                i--;
            }
            /* Remove pure dummy links. */
            else if (l.source.nodeType == "dummy" && l.target.nodeType == "dummy") {
                nodePredMap[l.target.id].splice(nodePredMap[l.target.id].indexOf(l.source.id), 1);
                nodeLinkPredMap[l.target.id].splice(nodeLinkPredMap[l.target.id].indexOf(l.id), 1);
                nodeSuccMap[l.source.id].splice(nodeSuccMap[l.source.id].indexOf(l.target.id), 1);
                nodeLinkSuccMap[l.source.id].splice(nodeLinkSuccMap[l.source.id].indexOf(l.id), 1);
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
            var sourceId = links[dP.id].source.id,
                targetId = links[dP.id].target.id;

            nodePredMap[targetId] = nodePredMap[targetId].concat(dP.target.predNodes.filter(function (pn) {
                return nodePredMap[targetId].indexOf(pn) === -1;
            }));
            nodeLinkPredMap[targetId] = nodeLinkPredMap[targetId].concat(dP.target.predNodeLinks.filter(function (pnl) {
                return nodeLinkPredMap[targetId].indexOf(pnl) === -1;
            }));
            nodeSuccMap[sourceId] = nodeSuccMap[sourceId].concat(dP.source.succNodes.filter(function (sn) {
                return nodeSuccMap[sourceId].indexOf(sn) === -1;
            }));
            nodeLinkSuccMap[sourceId] = nodeLinkSuccMap[sourceId].concat(dP.source.succNodeLinks.filter(function (snl) {
                return nodeLinkSuccMap[sourceId].indexOf(snl) === -1;
            }));
            nodes[targetId].parents = nodes[targetId].parents.concat(dP.parents.filter(function (p) {
                return nodes[targetId].parents.indexOf(p) === -1;
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
            var rightMostPredCol = depth;


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

        for (var i = 0; i < depth; i++) {
            for (var j = 0; j < width; j++) {
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

    var runLayoutPrivate = function (graph) {
        nodes = graph.nodes;
        links = graph.links;
        iNodes = graph.iNodes;
        oNodes = graph.oNodes;
        aNodes = graph.aNodes;
        saNodes = graph.saNodes;

        nodePredMap = graph.nodePredMap;
        nodeSuccMap = graph.nodeSuccMap;
        nodeLinkPredMap = graph.nodeLinkPredMap;
        nodeLinkSuccMap = graph.nodeLinkSuccMap;

        width = graph.width;
        depth = graph.depth;
        grid = graph.grid;

        /* Group output nodes by sub-analysis and analysis. */
        oNodes = sortOutputNodes();

        /* Topological order. */
        var topNodes = sortTopological(oNodes);
        if (topNodes !== null) {
            /* Assign layers. */
            assignLayers(topNodes);

            /* Add dummy nodes and links. */
            addDummyNodes();

            /* Recalculate layers including dummy nodes. */
            topNodes = sortTopological(oNodes);
            assignLayers(topNodes);

            /* Group nodes by layer. */
            var layeredTopNodes = groupNodesByCol(topNodes);

            /* Place vertices. */
            computeLayout(layeredTopNodes);

            /* Restore original dataset. */
            removeDummyNodes();

            /* TODO: Revise postprocessing. */
            /* Optimize layout. */
            postprocessLayout();

            graph.nodes = nodes;
            graph.links = links;
            graph.iNodes = iNodes;
            graph.oNodes = oNodes;
            graph.aNodes = aNodes;
            graph.saNodes = saNodes;
            graph.nodePredMap = nodePredMap;
            graph.nodeSuccMap = nodeSuccMap;
            graph.nodeLinkPredMap = nodeLinkPredMap;
            graph.nodeLinkSuccMap = nodeLinkSuccMap;
            graph.width = width;
            graph.depth = depth;
            graph.grid = grid;
        } else {
            console.log("Error: Graph is not acyclic!");
        }
    };

    /**
     * Publish module function.
     */
    return{
        runLayout: function (graph) {
            runLayoutPrivate(graph);
        }
    };

}();