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
        links = [];

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
            grid[n.col][n.row] = n;
        });
    };

    /**
     * Group nodes by layers into a 2d array.
     * @param topNodes Topological sorted nodes.
     * @returns {Array} Layer grouped array of nodes.
     */
    var groupNodesByLayer = function (topNodes) {
        var layer = firstLayer,
            lgNodes = []; /* Layer-grouped and topology sorted nodes. */

        lgNodes.push([]);
        var k = 0;
        topNodes.forEach(function (n) {
            if (nodes[n.id].col === layer) {
                lgNodes[k].push(nodes[n.id]);
            } else if (nodes[n.id].col < layer) {
                lgNodes[nodes[n.id].col].push(nodes[n.id]);
            } else {
                k++;
                layer++;
                lgNodes.push([]);
                lgNodes[k].push(nodes[n.id]);
            }
        });

        return lgNodes;
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     */
    var initRowPlacementLeft = function (lgNodes) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                n.rowBK.left = i;
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
                n.rowBK.right = depth - lg.length + i;
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

                    if (!n.succs.empty()) {
                        degree = n.succs.size();
                        n.succs.values().forEach(function (sn) {
                            accRows += (sn.rowBK.left + 1);
                        });
                    }

                    /* If any node within the layer has the same barycenter value, increase it by a small value. */
                    if (usedCoords.indexOf(accRows / degree) === -1) {
                        n.bcOrder = accRows / degree;
                        usedCoords.push(accRows / degree);
                    } else {
                        n.bcOrder = accRows / degree + delta;
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
                    n.bcOrder = j + 1;
                    barycenterOrderedNodes[firstLayer][j] = n;

                    /* Set earlier computed bcOrder. */
                } else {
                    barycenterOrderedNodes[i][j] = n;
                }
            });

            /* Reorder by barycentric value. */
            barycenterOrderedNodes[i].sort(function (a, b) {
                return a.bcOrder - b.bcOrder;
            });

            /* Set row attribute after sorting. */
            barycenterOrderedNodes[i].forEach(function (n, k) {
                n.rowBK.left = k;
                n.rowBK.right = width - barycenterOrderedNodes[i].length + k;
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
                var succs = bclgNodes[l][i].succLinks.values();
                if (succs.length !== 0) {
                    if (succs.length % 2 === 0) {
                        links[succs[parseInt(succs.length / 2 - 1, 10)].id].l.neighbor = true;
                    }
                    links[succs[parseInt(succs.length / 2, 10)].id].l.neighbor = true;
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

        var mapSuccsToIds = function (d) {
            return d.succLinks.values().map(function (n) {
                return n.id;
            });
        };

        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var leftMostPredRow = -1,
                leftMostLink = -1;

            /* Get left most link. */
            upSuccs.forEach(function (ups) {
                if (links[ups].target.predLinks.size() > 1) {
                    leftMostPredRow = links[upSuccs[0]].source.rowBK.left;
                    links[ups].target.predLinks.values().forEach(function (pl) {
                        if (pl.target.nodeType !== "dummy" || pl.source.nodeType !== "dummy") {

                            /* Check top most link. */
                            if (pl.source.rowBK.left < leftMostPredRow) {
                                leftMostPredRow = pl.source.rowBK.left;
                                leftMostLink = pl.id;
                            }
                        }
                    });
                }
            });

            /* Mark all but left most links. */
            upSuccs.forEach(function (ups) {
                if (links[ups].target.predLinks.size() > 1 && leftMostLink !== -1) {
                    links[ups].target.predLinks.values().forEach(function (pl) {
                        if (pl.id !== leftMostLink) {
                            pl.l.type0 = true;
                            pl.l.neighbor = false;
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
                                btUpSuccs = mapSuccsToIds(bclgNodes[upl][m]).filter(filterNeighbors);
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
                    upSuccs = mapSuccsToIds(bclgNodes[upl][i]).filter(filterNeighbors);
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

        var mapSuccsToIds = function (d) {
            return d.succLinks.values().map(function (n) {
                return n.id;
            });
        };

        var markUpCrossings = function () {

            /* Resolve shared nodes first. (Type 0 Conflict) */
            var rightMostPredRow = -1,
                rightMostLink = -1;

            /* Get right most link. */
            upSuccs.forEach(function (ups) {
                if (links[ups].target.predLinks.size() > 1) {
                    rightMostPredRow = links[upSuccs[0]].source.rowBK.right;
                    links[ups].target.predLinks.values().forEach(function (pl) {
                        if (pl.target.nodeType !== "dummy" || pl.source.nodeType !== "dummy") {

                            /* Check right most link. */
                            if (pl.source.rowBK.right > rightMostPredRow) {
                                rightMostPredRow = pl.source.rowBK.right;
                                rightMostLink = pl.id;
                            }
                        }
                    });
                }
            });

            /* Mark all but right most links. */
            upSuccs.forEach(function (ups) {
                if (links[ups].target.predLinks.size() > 1 && rightMostLink !== -1) {
                    links[ups].target.predLinks.values().forEach(function (pl) {
                        if (pl.id !== rightMostLink) {
                            pl.l.type0 = true;
                            pl.l.neighbor = false;
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
                                btUpSuccs = mapSuccsToIds(bclgNodes[upl][m]).filter(filterNeighbors);
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
                    upSuccs = mapSuccsToIds(bclgNodes[upl][i]).filter(filterNeighbors);
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

        var createSuccs = function (d) {
            return d.succLinks.values().map(function (n) {
                return n.id;
            });
        };

        var createPreds = function (d) {
            return d.predLinks.values().map(function (n) {
                return n.id;
            });
        };

        /* UPPER */

        /* Iterate through graph layer by layer,
         * if node is root, iterate through block and place nodes into rows. */
        for (var l = 0; l < bclgNodes.length; l++) {
            for (var i = 0; i < bclgNodes[l].length; i++) {
                var succs = createSuccs(bclgNodes[l][i]).filter(isBlockRoot);

                if (succs.length === 0) {
                    bclgNodes[l][i].isBlockRoot = true;

                    /* Follow path through Neighbors in predecessors and set row to root row. */
                    var rootRow = alignment === "left" ? bclgNodes[l][i].rowBK.left : bclgNodes[l][i].rowBK.right,
                        curLink = -1,
                        curNode = bclgNodes[l][i];

                    /* Traverse. */
                    while (curLink !== -2) {
                        curLink = createPreds(curNode).filter(filterNeighbor);
                        if (curLink.length === 0) {
                            curLink = -2;
                        } else {
                            /* Greedy choice for Neighbor when there exist two. */
                            if (alignment === "left") {
                                links[curLink[0]].source.rowBK.left = rootRow;
                                curNode = links[curLink[0]].source;
                            } else {
                                links[curLink[curLink.length - 1]].source.rowBK.right = rootRow;
                                curNode = links[curLink[curLink.length - 1]].source;
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

                if (n.isBlockRoot) {
                    var curNode = n,
                        minRow = Math.min(curNode.rowBK.left, curNode.rowBK.right),
                        delta = Math.abs(curNode.rowBK.left - curNode.rowBK.right) / 2;

                    rootRow = Math.round(minRow + delta);

                    while (!curNode.preds.empty()) {
                        curNode.row = rootRow;
                        curNode = curNode.preds.values()[0];
                    }
                    if (curNode.preds.empty()) {
                        curNode.row = rootRow;
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
                        predNodes: l.source.preds.values().map(function (p) {
                            return p.id;
                        }).filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: l.source.predLinks.values().map(function (p) {
                            return p.id;
                        }).filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: l.source.succs.values().map(function (p) {
                            return p.id;
                        }).filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: l.source.succLinks.values().map(function (p) {
                            return p.id;
                        }).filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        })
                    }),
                    target: ({
                        id: l.target.id,
                        predNodes: l.target.preds.values().map(function (p) {
                            return p.id;
                        }).filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        predNodeLinks: l.target.predLinks.values().map(function (p) {
                            return p.id;
                        }).filter(function (p) {
                            return nodes[p].nodeType !== "dummy";
                        }),
                        succNodes: l.target.succs.values().map(function (p) {
                            return p.id;
                        }).filter(function (s) {
                            return nodes[s].nodeType !== "dummy";
                        }),
                        succNodeLinks: l.target.succLinks.values().map(function (p) {
                            return p.id;
                        }).filter(function (s) {
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

                /* Insert Nodes. */
                var i = 0;
                while (i < gapLength - 1) {
                    nodes.push(new provvisDecl.Node(newNodeId + i, "dummy", curParent, false,
                            "dummyNode-" + (newNodeId + i), "dummy", curStudy, curAssay,
                        (i === 0) ? [l.source.uuid] : ["dummyNode-" + predNodeId], curAnalysis, curSubanalysis,
                            "dummyNode-" + (newNodeId + i)));
                    nodes[newNodeId + i].col = curCol + 1;
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

                /* Insert Links. */
                var j = 0;
                while (j < gapLength) {
                    links.push(new provvisDecl.Link(newLinkId + j, nodes[predNodeId],
                        (j === gapLength - 1) ? l.target : nodes[newNodeId + j], false));
                    predNodeId = newNodeId + j;
                    curCol++;
                    j++;
                }

                /* Remove successors for original source node. */
                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);

                /* Remove predecessors for original target node. */
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);

                /* Set maps for dummy path. */
                j = 0;
                var curLink = links[newLinkId];
                while (j < gapLength) {
                    curLink.source.succs.set(curLink.target.autoId, curLink.target);
                    curLink.source.succLinks.set(curLink.autoId, curLink);
                    curLink.target.preds.set(curLink.source.autoId, curLink.source);
                    curLink.target.predLinks.set(curLink.autoId, curLink);

                    curLink = links[newLinkId + j + 1];
                    j++;
                }
            }
        });
    };

    /**
     * Assign layers.
     * @param topNodes Topology sorted array of nodes.
     */
    var assignLayers = function (topNodes) {
        var layer = 0,
            succs = [];

        topNodes.forEach(function (n) {

            /* Get outgoing neighbor. */
            succs = nodes[n.id].succs.values();

            if (succs.length === 0) {
                nodes[n.id].col = layer;
            } else {
                var minSuccLayer = layer;
                succs.forEach(function (s) {
                    if (s.col > minSuccLayer) {
                        minSuccLayer = s.col;
                    }
                });
                nodes[n.id].col = minSuccLayer + 1;
            }
        });
    };


    /**
     * Reduces the collection of graph nodes to an object only containing id, preds and succs.
     * @returns {Array} Returns a reduced collection of graph nodes.
     */
    var createReducedGraph = function () {
        var graphSkeleton = [];

        nodes.forEach(function (n) {
            var nodePreds = [];
            n.preds.values().forEach(function (pp) {
                nodePreds.push(pp.id);
            });
            var nodeSuccs = [];
            n.succs.values().forEach(function (ss) {
                nodeSuccs.push(ss.id);
            });
            graphSkeleton.push({id: n.id, p: nodePreds, s: nodeSuccs});
        });

        return graphSkeleton;
    };

    /**
     * Reduces the collection of output nodes to an object only containing id, preds and succs.
     * @param oNodes Output nodes.
     * @returns {Array} Returns a reduced collection of output nodes.
     */
    var createReducedOutputNodes = function (oNodes) {
        var outputNodesSkeleton = [];

        oNodes.forEach(function (n) {
            var nodePreds = [];
            n.preds.values().forEach(function (pp) {
                nodePreds.push(pp.id);
            });
            outputNodesSkeleton.push({id: n.id, p: nodePreds, s: []});
        });
        return outputNodesSkeleton;
    };

    /* TODO: Revise topsort. */
    /**
     * Linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting).
     * @param oNodes Output nodes.
     * @returns {*} If graph is acyclic, returns null; else returns topology sorted array of nodes.
     */
    var sortTopological = function (oNodes) {
        var s = [], /* Copy of output nodes array. */
            l = [], /* Result set for sorted elements. */
            t = [], /* Copy nodes array, because we have to delete links from the graph. */
            n = Object.create(null);

        s = createReducedOutputNodes(oNodes);
        t = createReducedGraph();

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
     * Sort output nodes by subanalysis and analysis.
     * Secondly, the distance for every pair of analyses (which are part of the graphs outputnodes) are computed
     * and prioritized to be aligned together in the most-right and fixed layer of the graph.
     * @param oNodes Output nodes.
     * @param saNodes Subanalysis nodes.
     * @returns {Array} The sorted array of output nodes.
     */
    var sortOutputNodes = function (oNodes, saNodes) {

        /* Sort output nodes. */
        oNodes.sort(function (a, b) {
            return b.parent.id - a.parent.id;
        });

        /* Set analyses as output analyses. */
        oNodes.forEach(function (n) {
            /* Set subanalysis as output. */
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
            sa.succs.values().forEach(traverseFront);
            curDist--;
        };

        /* Traverse in predecessor direction. */
        var traverseBack = function (sa) {
            foundNeighbor(sa);

            // traverse front
            var succs = sa.succs.values().filter(function (ssa) {
                return ssa.id !== curSa.id;
            });
            curSa = sa;
            curDist++;
            succs.forEach(function (ssa) {
                traverseFront(ssa);
            });
            sa.preds.values().forEach(function (psa) {
                traverseBack(psa);
            });
            curDist--;
        };

        /* Each output subanalysis then has its path length to another output subanalysis. */
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

        /* For each neighbors of an output subanalysis, cluster them with the connecting output subanalyses. */
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

        /* Every output subanalysis has its nearest neighbors. */
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

        /* Iterate over output subanalysis and insert it directly after its nearest neighbor.*/
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
                ar.push.apply(ar, sa.outputs.values());
            } else {
                tail = ar.splice(cutIndex, ar.length - cutIndex);
                ar.push.apply(ar, sa.outputs.values());
                ar.push.apply(ar, tail);
            }
        };

        /* Traverse back and forth to find distance with path hops between subanalyses. */
        var findConnections = function () {
            saNodes.forEach(function (sani) {
                curDist++;
                curSa = sani;
                origSa = sani;
                sani.preds.values().forEach(function (psa) {
                    traverseBack(psa);
                });
                sani.succs.values().forEach(function (ssa) {
                    traverseFront(ssa);
                });
                curDist--;
            });
        };

        var reorderOutputNodes = function () {
            /* Set dataset subanalyses without any successor analyses. */
            saNodes.filter(function (sa) {
                return sa.isOutputAnalysis;
            }).filter(function (sa) {
                return getNeighbors(dist[saNodes.indexOf(sa)], saNodes.indexOf(sa)).length === 0;
            }).forEach(function (sa) {
                sortedoNodes.push.apply(sortedoNodes, sa.outputs.values());
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
                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);
                links.splice(i, 1);
                i--;
            }
            /* Clean target. */
            else if (l.source.nodeType == "dummy" && l.target.nodeType != "dummy") {
                l.target.parents.splice(l.target.parents.indexOf(l.source.uuid), 1);
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);
                links.splice(i, 1);
                i--;
            }
            /* Remove pure dummy links. */
            else if (l.source.nodeType == "dummy" && l.target.nodeType == "dummy") {
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);
                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);
                links.splice(i, 1);
                i--;
            }
        }

        /* Clean up nodes. */
        for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];

            if (n.nodeType === "dummy") {
                n.preds = d3.map();
                n.succs = d3.map();
                n.predLinks = d3.map();
                n.succLinks = d3.map();

                nodes.splice(j, 1);
                j--;
            }
        }

        /* Restore links. */
        dummyPaths.forEach(function (dP) {
            var sourceId = links[dP.id].source.id,
                targetId = links[dP.id].target.id;

            dP.target.predNodes.forEach(function (pn) {
                nodes[targetId].preds.set(nodes[pn].autoId, nodes[pn]);
            });
            dP.target.predNodeLinks.forEach(function (pnl) {
                nodes[targetId].predLinks.set(links[pnl].autoId, links[pnl]);
            });
            dP.source.succNodes.forEach(function (sn) {
                nodes[sourceId].succs.set(nodes[sn].autoId, nodes[sn]);
            });
            dP.source.succNodeLinks.forEach(function (snl) {
                nodes[sourceId].succLinks.set(links[snl].autoId, links[snl]);
            });

            nodes[targetId].parents = nodes[targetId].parents.concat(dP.parents.filter(function (p) {
                return nodes[targetId].parents.indexOf(p) === -1;
            }));
        });
        dummyPaths = [];
    };

    /**
     * Compress analysis horizontally.
     * @param aNodes Analysis nodes.
     */
    var horizontalAnalysisAlignment = function (aNodes) {
        aNodes.forEach(function (an) {

            var maxOutput = d3.max(an.outputs.values(), function (d) {
                return d.col;
            });

            an.outputs.values().filter(function (d) {
                return d.col < maxOutput;
            }).forEach(function (ano) {
                var curNode = ano,
                    j = 0;

                /* Check for gaps. */
                if (curNode.col < maxOutput) {

                    /* Get first node for this block. */
                    var curBlockNode = curNode;
                    while (curBlockNode.preds.size() === 1 &&
                        curBlockNode.preds.values()[0].analysis === an.uuid &&
                        curBlockNode.preds.values()[0].col - curBlockNode.col === 1) {
                        curBlockNode = curBlockNode.preds.values()[0];
                    }

                    /* When pred for leading block node is of the same analysis. */
                    while (curNode.col < maxOutput &&
                        curBlockNode.preds.size() === 1 &&
                        curBlockNode.preds.values()[0].analysis === an.uuid &&
                        curNode.preds.size() === 1) {
                        var predNode = curNode.preds.values()[0];
                        if (predNode.col - curNode.col > 1) {

                            var shiftCurNode = curNode,
                                colShift = maxOutput + j;

                            /* Shift the gap to align with the maximum output column of this analysis. */
                            while (shiftCurNode !== ano) {
                                shiftCurNode.col = colShift;
                                shiftCurNode = shiftCurNode.succs.values()[0];
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
     * @param aNodes Analysis nodes.
     */
    var leftShiftAnalysis = function (aNodes) {
        aNodes.forEach(function (an) {

            var leftMostInputCol = d3.max(an.inputs.values(), function (ain) {
                return ain.col;
            });
            var rightMostPredCol = depth;


            an.inputs.values().forEach(function (ain) {
                var curMin = d3.min(ain.preds.values(),
                    function (ainpn) {
                        return ainpn.col;
                    });

                if (curMin < rightMostPredCol) {
                    rightMostPredCol = curMin;
                }
            });

            /* Shift when gap. */
            if (rightMostPredCol - leftMostInputCol > 1 && an.succs.empty()) {
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
            return sn.analysis !== grid[i][j].analysis;
        };

        var getMedianRow = function (d) {
            var medianRow = d.succs.values().sort(function (a, b) {
                return a.row - b.row;
            }).map(function (n) {
                return n.row;
            });
            return medianRow[Math.floor(medianRow.length / 2)];
        };

        for (var i = 0; i < depth; i++) {
            for (var j = 0; j < width; j++) {
                if (grid[i][j] !== "undefined" && grid[i][j].succs.size() > 1 && grid[i][j].succs.values().some(isAnotherAnalysis)) {

                    /* Within this analysis and for each predecessor, traverse back and shift rows. */
                    var newRow = getMedianRow(grid[i][j]),
                        curNode = grid[i][j];

                    while (curNode.preds.size() === 1) {
                        grid[i][j] = "undefined";
                        grid[i][newRow] = curNode;
                        curNode.row = newRow;
                        curNode = curNode.preds.values()[0];
                    }
                    if (curNode.preds.empty()) {
                        grid[i][j] = "undefined";
                        grid[i][newRow] = curNode;
                        curNode.row = newRow;
                    }
                }
            }
        }
    };

    /**
     * Optimize layout.
     * @param saNodes Subanalysis nodes.
     * @param aNodes Analysis nodes.
     */
    var postprocessLayout = function (saNodes, aNodes) {

        horizontalAnalysisAlignment(saNodes);

        leftShiftAnalysis(aNodes);

        createNodeGrid();

        centerAnalysisOnRightSplit();

        /* TODO: When centering at a split, check block-class with occupied rows/cols (Compaction). */
        /* TODO: Form classes for blocks and rearrange analysis. */
    };

    /**
     * Main layout module function.
     * @param graph The main graph object of the provenance visualization.
     */
    var runLayoutPrivate = function (graph) {
        nodes = graph.nodes;
        links = graph.links;

        width = graph.width;
        depth = graph.depth;
        grid = graph.grid;

        /* Group output nodes by subanalysis and analysis. */
        graph.oNodes = sortOutputNodes(graph.oNodes, graph.saNodes);

        /* Topological order. */
        var topNodes = sortTopological(graph.oNodes);
        if (topNodes !== null) {
            /* Assign layers. */
            assignLayers(topNodes);

            /* Add dummy nodes and links. */
            addDummyNodes();

            /* Recalculate layers including dummy nodes. */
            topNodes = sortTopological(graph.oNodes);
            assignLayers(topNodes);

            /* Group nodes by layer. */
            var lgNodes = groupNodesByLayer(topNodes);

            /* Place vertices. */
            computeLayout(lgNodes);

            /* Restore original dataset. */
            removeDummyNodes();

            /* TODO: Revise postprocessing. */
            /* Optimize layout. */
            postprocessLayout(graph.saNodes, graph.aNodes);

            graph.nodes = nodes;
            graph.links = links;

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