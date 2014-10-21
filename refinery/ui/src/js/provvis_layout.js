/**
 * Module for layout.
 */
var provvisLayout = function () {

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
            lgNodes = [];
        /* Layer-grouped and topology sorted nodes. */

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

    /**
     * Generic implementation for the linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting).
     * @param startNodes Array containing the starting nodes.
     * @returns {Array} Topology sorted array of nodes.
     */
    var topSortNodes = function (startNodes) {
        var sortedNodes = [];

        /* For each successor node. */
        var handleSuccessorSAN = function (predNode) {
            predNode.succs.values().forEach( function (succNode) {
                /* Mark edge as removed. */
                succNode.predLinks.values().forEach( function (predLink) {
                    if (predLink.source.parent.id === predNode.id) {
                        predLink.l.ts.removed = true;
                    }
                });

                /* When successor node has no other incoming edges,
                 insert successor node into result set. */
                if (!succNode.predLinks.values().some(function (predLink) {
                    return !predLink.l.ts.removed;
                })) {
                    startNodes.push(succNode);
                }
            });
        };

        /* While the input set is not empty. */
        while(startNodes.length > 0) {

            /* Remove first item. */
            var curNode = startNodes.shift();

            /* And push it into result set. */
            sortedNodes.push(curNode);

            /* Get successor nodes for curSAN. */
            handleSuccessorSAN(curNode);
        }

        return sortedNodes;
    };

    /* TODO: In development. */
    var layerNodes = function (tsNodes) {
        tsNodes.forEach( function (n) {

        });
    };

    /* TODO: In development. */
    var groupNodes = function (tsNodes) {

        return [];
    };

    /* TODO: In development. */
    var layoutNodes = function (gNodes) {

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

        console.log("Provvis: New layout is active.");




        /* SUBANALYSIS LAYOUT. */
        /* TODO: Generic re-implementation for subanalysis nodes. */

        /* Add input subanalyses to starting nodes. */
        var startSANodes = [];
        graph.dataset.children.values().forEach(function (san) {
            startSANodes.push(san);
        });
        var tsSANodes = topSortNodes(startSANodes);

        if (tsSANodes !== null) {
            layerNodes(tsSANodes);

            var gSANodes = groupNodes(tsSANodes);

            layoutNodes(gSANodes);

            // createNodeGrid();
        } else {
            console.log("Error: Graph is not acyclic!");
        }





        /* ANALYSIS LAYOUT. */
        /* TODO: Generic re-implementation for analysis nodes. */

        var startANodes = [];
        startANodes.push(graph.dataset);
        var tsANodes = topSortNodes(startANodes);
console.log(tsANodes.map(function (d) {return d.id;}));
        if (tsANodes !== null) {
            layerNodes(tsANodes);

            var gANodes = groupNodes(tsANodes);

            layoutNodes(gANodes);

            // createNodeGrid();
        } else {
            console.log("Error: Graph is not acyclic!");
        }





        /* FILES/TOOLS LAYOUT. */
        /* TODO: Generic re-implementation for files/tools of one subanalysis (workflow). */

        /* Topological order. */
        var topNodes = sortTopological(graph.oNodes);
        if (topNodes !== null) {
            /* Assign layers. */
            assignLayers(topNodes);

            /* Group nodes by layer. */
            var lgNodes = groupNodesByLayer(topNodes);

            /* Place vertices. */
            computeLayout(lgNodes);

            /* Create grid. */
            createNodeGrid();

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