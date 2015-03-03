/**
 * Module for layout.
 */
var provvisLayout = function () {

    /* The layout is processed from the left (beginning at column/layer 0) to the right. */
    var firstLayer = 0;

    /* Restore dummy path link. */
    var dummyPaths = [];

    /**
     * Maps the column/row index to nodes.
     * @param parent The parent node.
     */
    var initNodeGrid = function (parent) {
        var grid = [];

        for (var i = 0; i < parent.l.depth; i++) {
            grid.push([]);
            for (var j = 0; j < parent.l.width; j++) {
                grid[i][j] = "undefined";
            }
        }

        parent.l.grid = grid;
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     */
    var initRowPlacementLeft = function (lgNodes) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                n.l.rowBK.left = i;
            });
        });
    };

    /**
     * Init row placement.
     * @param lgNodes Layer grouped array of nodes.
     * @param graph The provenance graph.
     */
    var initRowPlacementRight = function (lgNodes, graph) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                n.l.rowBK.right = graph.l.depth - lg.length + i;
            });
        });
    };

    /**
     * 1-sided crossing minimization via barycentric heuristic.
     * @param lgNodes Layer grouped array of nodes.
     * @param parent The parent node.
     * @returns {Array} Layer grouped array of nodes sorted by barycenter heuristic.
     */
    var oneSidedCrossingMinimisation = function (lgNodes, parent) {
        /* For each layer (fixed layer L0), check layer to the right (variable layer L1). */
        lgNodes.forEach(function (lg, i) {
            var usedCoords = [],
                delta = 0.01;

            /* If there is a layer right to the current layer. */
            if (typeof lgNodes[i + 1] !== "undefined" && lgNodes[i + 1] !== null) {

                /* For each node within the variable layer. */
                lgNodes[i + 1].forEach(function (n) {
                    var degree = 1,
                        accRows = 0;

                    if (!n.preds.empty()) {
                        degree = n.preds.size();
                        n.preds.values().forEach(function (pn) {
                            var curA = pn;
                            if (pn instanceof provvisDecl.Node && parent instanceof provvisDecl.ProvGraph) {
                                curA = pn.parent.parent;
                            }
                            accRows += (curA.l.rowBK.left + 1);
                        });
                    }

                    /* If any node within the layer has the same barycenter value, increase it by a small value. */
                    if (usedCoords.indexOf(accRows / degree) === -1) {
                        n.l.bcOrder = accRows / degree;
                        usedCoords.push(accRows / degree);
                    } else {
                        n.l.bcOrder = accRows / degree + delta;
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

                /* Init most left layer as fixed. */
                if (i === firstLayer) {
                    n.l.bcOrder = j + 1;
                    barycenterOrderedNodes[firstLayer][j] = n;

                    /* Set earlier computed bcOrder. */
                } else {
                    barycenterOrderedNodes[i][j] = n;
                }
            });

            /* Reorder by barycentric value. */
            barycenterOrderedNodes[i].sort(function (a, b) {
                return a.l.bcOrder - b.l.bcOrder;
            });

            /* Set row attribute after sorting. */
            barycenterOrderedNodes[i].forEach(function (n, k) {
                n.l.rowBK.left = k;
                n.l.rowBK.right = parent.l.width - barycenterOrderedNodes[i].length + k;
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
                 the exact median if the length of prdecessor nodes is odd,
                 else the middle two. */
                var pl = bclgNodes[l][i].predLinks;
                if (pl.size() !== 0) {
                    if (pl.size() % 2 === 0) {
                        pl.values()[parseInt(pl.size() / 2 - 1, 10)].l.neighbor = true;
                    }
                    pl.values()[parseInt(pl.size() / 2, 10)].l.neighbor = true;
                }
                i++;
            }
            l++;
        }
    };

    /**
     * Start at 2nd layer.
     * Within the layer - from left to right - get predLinks for each node.
     * For each predlink check conflicts as followed:
     * Type 2: No crossings are possible and therefore this step is omitted.
     * Type 1: Is there a crossing between an inner and a non-inner segment? If so, mark non-inner segment as 'type1'.
     * Type 0: Is there a crossing between a pair of non-inner segments? Does the predLink share a node? If so, mark non-inner segment as 'type'.
     * Finally, if there are multiple predlinks with no conflicts left, set all but the left most neighbors to 'false'.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     * @param links Graph links.
     */
    var markConflictsLeft = function (bclgNodes, links) {

        /* Helper. */
        var filterNeighbors = function (pl) {
            return pl.l.neighbor && pl.l.type0 === false && pl.l.type1 === false ? true : false;
        };

        /* Backtracked upper successor links. */
        var backtrackUpCrossings = function () {
            btUpNeighbors.forEach(function (btp) {
                /* Crossing. */
                if (btp.source.l.rowBK.left > jMax) {
                    btp.l.type1 = true;
                    btp.l.neighbor = true;
                }
            });
        };

        var upNeighbors = [],
            btUpNeighbors = [];

        var markUpCrossings = function () {

            /* Type 2 conflicts are omitted. */

            /* Type 1 and 0 crossing conflicts. */
            var curjMax = jMax;
            upNeighbors.forEach(function (upp) {

                var srcA = upp.source,
                    tarA = upp.target;
                if (upp.source instanceof provvisDecl.Node) {
                    srcA = upp.source.parent.parent;
                }
                if (tarA instanceof provvisDecl.Node) {
                    tarA = upp.target.parent.parent;
                }

                if (srcA.l.rowBK.left >= jMax) {
                    if (srcA.l.rowBK.left > curjMax) {
                        curjMax = srcA.row;
                    }
                    /* Crossing. */
                } else {
                    /* Type 0 and 1 conflict: If link is an non-inner segment, mark link to be removed. */
                    if (tarA.uuid !== "dummy" || srcA.uuid !== "dummy") {
                        upp.l.type1 = true;

                        /* If link is an inner segment, remove all non-inner segments crossing it beforehand. */
                    } else {
                        /* Iterate back in current layer. */
                        var m = i;
                        for (m; m > 0; m--) {
                            if (m < i) {
                                /* Get predLinks for m */
                                btUpNeighbors = bclgNodes[upl][m].predLinks.values().filter(filterNeighbors);
                                backtrackUpCrossings();
                            }
                        }

                    }
                }
            });
            jMax = curjMax;

            /* Update upNeighbors. */
            upNeighbors = bclgNodes[upl][i].predLinks.values().filter(filterNeighbors);

            /* Type 0 sharing conflicts. */
            var leftMostPredRow = -1,
                leftMostLink = "undefined";

            /* Init left most link. */
            if (upNeighbors.length > 0) {
                var srcA = upNeighbors[0].source;
                if (srcA instanceof provvisDecl.Node) {
                    srcA = upNeighbors[0].source.parent.parent;
                }
                leftMostPredRow = srcA.l.rowBK.left;
                leftMostLink = upNeighbors[0];
            }

            /* Get left most link. */
            upNeighbors.forEach(function (upp) {
                var srcA = upp.source;
                if (upp.source instanceof provvisDecl.Node) {
                    srcA = upp.source.parent.parent;
                }

                if (srcA.l.rowBK.left < leftMostPredRow) {
                    leftMostPredRow = srcA.l.rowBK.left;
                    leftMostLink = upp;
                }
            });

            /* Mark all but left most links. */
            upNeighbors.forEach(function (upp) {
                var srcA = upp.source;
                if (upp.source instanceof provvisDecl.Node) {
                    srcA = upp.source.parent.parent;
                }

                if (srcA.succLinks.size() > 1 && leftMostLink !== "undefined") {
                    srcA.succLinks.values().forEach(function (sl) {
                        if (sl !== leftMostLink) {
                            sl.l.type0 = true;
                            sl.l.neighbor = false;
                        }
                    });
                }
            });

            /* Update upNeighbors. */
            upNeighbors = bclgNodes[upl][i].predLinks.values().filter(filterNeighbors);

            /* For multiple predlinks, prioritize the left one. */
            if (upNeighbors.length > 1) {
                upNeighbors.forEach(function (upp) {
                    if (upp !== leftMostLink) {
                        upp.l.neighbor = false;
                    }
                });
            }

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
                    upNeighbors = bclgNodes[upl][i].predLinks.values().filter(filterNeighbors);

                    markUpCrossings();
                }
                i++;
            }
            upl++;
        }
    };

    /* TODO: Refine and clean up. */
    /**
     * Align each vertex with its chosen (left|right and upper/under) Neighbor.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     * @param parent The parent node.
     */
    var verticalAlignment = function (bclgNodes, parent) {
        markCandidates(bclgNodes, parent.aLinks.filter(function (l) {
            return !l.l.gap;
        }));

        markConflictsLeft(bclgNodes, parent.aLinks.filter(function (l) {
            return !l.l.gap;
        }));

        formBlocks(bclgNodes, "left", parent);

        /* Reset conflicts. */
        /*
         links.forEach(function (l) {
         l.l.type0 = false;
         l.l.type1 = false;
         });
         markConflictsRight(bclgNodes, links);
         formBlocks(bclgNodes, "right", links);*/
    };

    /**
     * After resolving conflicts, minimal crossings are left and connected paths are concatenated into blocks.
     * Iterate through each layer from left to right, for each node:
     * When node has no predecessor links with neighbor marked, node is root for block.
     * The block's row is determined by the most right row of any node in the block.
     * For each node in the block, assign the most right row.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     * @param alignment Left or right aligned layout initialization.
     * @param parent The Provenance graph.
     */
    var formBlocks = function (bclgNodes, alignment, parent) {

        var isNeighbor = function (l) {
            return l.l.neighbor ? true : false;
        };

        /* Add additional cell to grid column. */
        var addGridRow = function (parent) {
            parent.l.grid.forEach(function (gc) {
                gc.push("undefined");
            });
            parent.l.width += 1;
        };

        /* UPPER */

        /* Iterate through graph layer by layer,
         * if node is root, iterate through block and place nodes into rows. */
        for (var l = 0; l < bclgNodes.length; l++) {
            for (var i = 0; i < bclgNodes[l].length; i++) {

                /* Get block root. */
                var preds = bclgNodes[l][i].predLinks.values().filter(isNeighbor);

                if (preds.length === 0) {
                    bclgNodes[l][i].l.isBlockRoot = true;

                    /* Find block path. */
                    /* Get right most row. */
                    var succs = bclgNodes[l][i].succLinks.values().filter(isNeighbor),
                        rootRow = alignment === "left" ? bclgNodes[l][i].l.rowBK.left : bclgNodes[l][i].l.rowBK.right,
                        curLink = "undefined",
                        curA = bclgNodes[l][i],
                        blockLength = 1,
                        occupied = true;

                    while (succs.length === 1) {
                        curLink = succs[0];
                        curA = curLink.target instanceof provvisDecl.Node ? curLink.target.parent.parent : curLink.target;

                        if (alignment === "left" && curA.l.rowBK.left > rootRow) {
                            rootRow = curA.l.rowBK.left;
                        } else if (alignment === "right" && curA.l.rowBK.right < rootRow) {
                            rootRow = curA.l.rowBK.right;
                        }
                        succs = curA.succLinks.values().filter(isNeighbor);
                        blockLength++;
                    }

                    /* Check if block path is occupied. */
                    while (occupied) {
                        occupied = false;
                        succs = bclgNodes[l][i].succLinks.values().filter(isNeighbor);
                        curA = bclgNodes[l][i];
                        curLink = "undefined";
                        curA = bclgNodes[l][i];

                        if (parent.l.grid[curA.col][rootRow] && parent.l.grid[curA.col][rootRow] !== "undefined") {
                            occupied = true;
                        }

                        while (succs.length === 1 && !occupied) {
                            curLink = succs[0];
                            curA = curLink.target instanceof provvisDecl.Node ? curLink.target.parent.parent : curLink.target;

                            if (parent.l.grid[curA.col][rootRow] && parent.l.grid[curA.col][rootRow] !== "undefined") {
                                occupied = true;
                            }

                            succs = curA.succLinks.values().filter(isNeighbor);
                        }

                        if (occupied) {
                            /* Increase root row. */
                            rootRow++;
                        }
                    }


                    /* Save block path. */

                    /* Traverse through block and set root row. Set grid cells. */
                    succs = bclgNodes[l][i].succLinks.values().filter(isNeighbor);
                    if (alignment === "left") {
                        bclgNodes[l][i].l.rowBK.left = rootRow;
                    } else if (alignment === "right") {
                        bclgNodes[l][i].l.rowBK.right = rootRow;
                    }
                    bclgNodes[l][i].row = rootRow;

                    /* Add additional cell to grid column. */
                    while (parent.l.grid[bclgNodes[l][i].col].length <= rootRow) {
                        addGridRow(parent);
                    }

                    /* Set grid cell. */
                    parent.l.grid[bclgNodes[l][i].col][rootRow] = bclgNodes[l][i];

                    while (succs.length === 1) {
                        curLink = succs[0];
                        curA = curLink.target instanceof provvisDecl.Node ? curLink.target.parent.parent : curLink.target;

                        if (alignment === "left") {
                            curA.l.rowBK.left = rootRow;
                        } else if (alignment === "right") {
                            curA.l.rowBK.right = rootRow;
                        }
                        curA.row = rootRow;
                        succs = curA.succLinks.values().filter(isNeighbor);

                        while (parent.l.grid[curA.col].length <= rootRow) {
                            addGridRow(parent);
                        }
                        /* Set grid cell. */
                        parent.l.grid[curA.col][curA.row] = curA;
                    }
                }
            }
        }
    };

    /**
     * Balance y-coordinates for each layer by mean of in- and outgoing links.
     * @param bclgNodes Barycenter sorted layer grouped array of nodes.
     * @param parent The parent node.
     */
    var balanceLayout = function (bclgNodes, parent) {
        bclgNodes.forEach(function (lg) {
            lg.forEach(function (n) {
                var rootRow = -1;

                if (n.l.isBlockRoot) {
                    var curNode = n,
                        minRow = Math.min(curNode.l.rowBK.left, curNode.l.rowBK.right),
                        delta = Math.abs(curNode.l.rowBK.left - curNode.l.rowBK.right) / 2;

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
     * @param parent The parent node.
     */
    var verticalCoordAssignment = function (bclgNodes, parent) {
        verticalAlignment(bclgNodes, parent);

        /* TODO: In development. */
        //balanceLayout(bclgNodes, parent);
    };

    /**
     * Set grid layout dimensions.
     * @param lgNodes Layer grouped array of nodes.
     * @param parent The parent node.
     */
    var setGridLayoutDimensions = function (lgNodes, parent) {
        parent.l.width = d3.max(lgNodes, function (lg) {
            return lg.length;
        });

        parent.l.depth = lgNodes.length;
    };

    /**
     * Generic implementation for the linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting).
     * @param startNodes Array containing the starting nodes.
     * @param nodesLength Size of the nodes array.
     * @param parent The parent node.
     * @returns {Array} Topology sorted array of nodes.
     */
    var topSortNodes = function (startNodes, nodesLength, parent) {
        var sortedNodes = [];

        /* For each successor node. */
        var handleSuccessorNodes = function (curNode) {

            /* When the analysis layout is computed, links occur between dummy nodes (Analysis) and Nodes or Analysis.
             * In order to distinct both cases, the connection between dummy nodes and nodes is preserved by saving
             * the id of a node rather than its parent analysis id. */
            if (curNode instanceof provvisDecl.Node && parent instanceof provvisDecl.ProvGraph) {
                curNode = curNode.parent.parent;
            }

            /* Get successors. */
            curNode.succs.values().filter(function (s) {
                return s.parent === null || s.parent === parent || curNode.uuid === "dummy";
            }).forEach(function (succNode) {
                if (succNode instanceof provvisDecl.Node && parent instanceof provvisDecl.ProvGraph) {
                    succNode = succNode.parent.parent;
                }

                /* Mark edge as removed. */
                succNode.predLinks.values().forEach(function (predLink) {

                    /* When pred node is of type dummy, the source node directly is an analysis. */
                    var predLinkNode = null;
                    if (curNode instanceof provvisDecl.Analysis) {
                        if (predLink.source instanceof provvisDecl.Analysis) {
                            predLinkNode = predLink.source;
                        } else {
                            predLinkNode = predLink.source.parent.parent;
                        }
                    } else if (curNode instanceof provvisDecl.Node) {
                        predLinkNode = predLink.source;
                    }

                    if (predLinkNode && predLinkNode.autoId === curNode.autoId) {
                        predLink.l.ts.removed = true;
                    }
                });

                /* When successor node has no other incoming edges,
                 insert successor node into result set. */
                if (!succNode.predLinks.values().some(function (predLink) {
                    return !predLink.l.ts.removed;
                }) && !succNode.l.ts.removed) {
                    startNodes.push(succNode);
                    succNode.l.ts.removed = true;
                }
            });
        };

        /* While the input set is not empty. */
        var i = 0;
        while (i < startNodes.length && i < nodesLength) {

            /* Remove first item. */
            var curNode = startNodes[i];

            /* And push it into result set. */
            sortedNodes.push(curNode);
            curNode.l.ts.removed = true;

            /* Get successor nodes for current node. */
            handleSuccessorNodes(curNode);
            i++;
        }

        /* Handle cyclic graphs. */
        /* TODO: Review condition. */
        if (startNodes.length > nodesLength) {
            return null;
        } else {
            return sortedNodes;
        }
    };

    /**
     * Assign layers.
     * @param tsNodes Topology sorted nodes.
     * @param parent The parent node.
     */
    var layerNodes = function (tsNodes, parent) {
        var layer = 0,
            preds = [];

        tsNodes.forEach(function (n) {

            /* Get incoming predecessors. */
            n.preds.values().filter(function (p) {
                if (p.parent === parent) {
                    preds.push(p);
                } else if (p instanceof provvisDecl.Node && parent instanceof provvisDecl.ProvGraph) {
                    preds.push(p.parent.parent);
                }
            });

            if (preds.length === 0) {
                n.col = layer;
            } else {
                var minLayer = layer;
                preds.forEach(function (p) {
                    if (p.col > minLayer) {
                        minLayer = p.col;
                    }
                });
                n.col = minLayer + 1;
            }
        });
    };

    /**
     * Group nodes by layers into a 2d array.
     * @param tsNodes Topology sorted nodes.
     * @returns {Array} Layer grouped nodes.
     */
    var groupNodes = function (tsNodes) {
        var layer = 0,
            lgNodes = [];

        lgNodes.push([]);

        var k = 0;
        tsNodes.forEach(function (n) {
            if (n.col === layer) {
                lgNodes[k].push(n);
            } else if (n.col < layer) {
                lgNodes[n.col].push(n);
            } else {
                k++;
                layer++;
                lgNodes.push([]);
                lgNodes[k].push(n);
            }
        });

        return lgNodes;
    };

    /**
     * Layout node columns.
     * @param gNodes Layer grouped array of nodes.
     * @param parent The parent node.
     * @returns {Array} Layered analysis nodes.
     */
    var layoutNodes = function (gNodes, parent) {

        /* Set graph width and depth. */
        setGridLayoutDimensions(gNodes, parent);

        /* Init grid. */
        initNodeGrid(parent);

        /* Init row placement. */
        initRowPlacementLeft(gNodes);

        /* Init row placement. */
        initRowPlacementRight(gNodes, parent);

        /* Minimize edge crossings. */
        var bcgNodes = oneSidedCrossingMinimisation(gNodes, parent);

        /* TODO: In development. */
        /* Update row placements. */
        verticalCoordAssignment(bcgNodes, parent);

        return bcgNodes;
    };


    /**
     * Get number of nodes visited already.
     * @param arr Array of nodes.
     * @returns {number} The number of nodes visited already.
     */
    function getNumberofVisitedNodesByArray(arr) {
        var count = 0;

        arr.forEach(function (nn) {
            if (nn.visited) {
                count++;
            }
        });

        return count;
    }

    /**
     * Get nodes of columns from begin to end column id.
     * @param tsNodes The nodes within the subanalysis.
     * @param begin Column according to grid layout.
     * @param end (Including) Column according to grid layout.
     * @returns {Array} Set of nodes.
     */
    function getNodesByColumnRange(tsNodes, begin, end) {
        var nodesToTranslate = [];

        tsNodes.forEach(function (n) {
            if (n.col >= begin && n.col <= end) {
                nodesToTranslate.push(n);
            }
        });

        return nodesToTranslate;
    }

    /**
     * Shift specific nodes by rows.
     * @param tsNodes The nodes within the subanalysis.
     * @param rowShift Number of rows to shift.
     * @param col Nodes up to column.
     * @param row Nodes from row.
     */
    function shiftNodesByRows(tsNodes, rowShift, col, row) {
        getNodesByColumnRange(tsNodes, 0, col).forEach(function (nn) {
            if (nn.row >= row) {
                nn.row += rowShift;
            }
        });
    }


    /**
     * Add dummy vertices.
     * @param graph The provenance graph.
     */
    var addDummyNodes = function (graph) {

        /* First, backup original connections. */
        graph.aLinks.forEach(function (l) {

            /* When the link is longer than one column, add dummy nodes and links. */
            var gapLength = Math.abs(l.source.parent.parent.col - l.target.parent.parent.col);

            if (gapLength > 1) {
                dummyPaths.push({
                    id: l.autoId,
                    source: ({
                        id: l.source.parent.parent.autoId,
                        predNodes: l.source.parent.parent.preds.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        predNodeLinks: l.source.parent.parent.predLinks.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        succNodes: l.source.parent.parent.succs.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        succNodeLinks: l.source.parent.parent.succLinks.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        })
                    }),
                    target: ({
                        id: l.target.parent.parent.autoId,
                        predNodes: l.target.parent.parent.preds.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        predNodeLinks: l.target.parent.parent.predLinks.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        succNodes: l.target.parent.parent.succs.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        }),
                        succNodeLinks: l.target.parent.parent.succLinks.values().filter(function (p) {
                            return p.uuid !== "dummy";
                        }).map(function (p) {
                            return p.autoId;
                        })
                    })
                });
            }
        });

        /* Second, create new dummy nodes. */
        graph.aLinks.forEach(function (l) {

            var gapLength = Math.abs(l.source.parent.parent.col - l.target.parent.parent.col);

            if (gapLength > 1) {
                /* Dummy nodes are affiliated with the source node of the link in context. */
                var newNodeId = graph.aNodes.length,
                    newLinkId = graph.aLinks.length,
                    predNodeId = l.source.parent.parent.id,
                    curCol = l.source.parent.parent.col;

                /* Insert Nodes. */
                var i = 0;
                while (i < gapLength - 1) {
                    graph.aNodes.push(new provvisDecl.Analysis(newNodeId + i, graph, false, "dummy", "dummy", "dummy", 0, 0, 0));
                    graph.aNodes[newNodeId + i].col = curCol + 1;
                    predNodeId = newNodeId + i;
                    curCol++;
                    i++;
                }

                /* Insert links (one link more than nodes). */
                predNodeId = l.source.parent.parent.id;
                curCol = l.source.parent.parent.col;

                /* Insert Links. */
                var j = 0;
                while (j < gapLength) {
                    graph.aLinks.push(new provvisDecl.Link(newLinkId + j, (j === 0) ? l.source : graph.aNodes[predNodeId],
                        (j === gapLength - 1) ? l.target : graph.aNodes[newNodeId + j], false));
                    predNodeId = newNodeId + j;
                    curCol++;
                    j++;
                }

                /* Remove successors for original source node. */
                l.source.parent.parent.succs.remove(l.target.parent.parent.autoId);
                l.source.parent.parent.succLinks.remove(l.autoId);
                l.source.parent.succs.remove(l.target.parent.autoId);
                l.source.parent.succLinks.remove(l.autoId);
                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);

                /* Remove predecessors for original target node. */
                l.target.parent.parent.preds.remove(l.source.parent.parent.autoId);
                l.target.parent.parent.predLinks.remove(l.autoId);
                l.target.parent.preds.remove(l.source.parent.autoId);
                l.target.parent.predLinks.remove(l.autoId);
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);

                /* Set maps for dummy path. */
                j = 0;
                var curLink = graph.aLinks[newLinkId];
                while (j < gapLength) {

                    curLink.source.succs.set(curLink.target.autoId, curLink.target);
                    curLink.source.succLinks.set(curLink.autoId, curLink);
                    curLink.target.preds.set(curLink.source.autoId, curLink.source);
                    curLink.target.predLinks.set(curLink.autoId, curLink);

                    /* Connect target node with last dummy node. */
                    if (j + 1 === gapLength) {
                        l.target.predLinks.set(curLink.autoId, curLink);
                        l.target.preds.set(curLink.source.autoId, curLink.source);
                        l.target.parent.predLinks.set(curLink.autoId, curLink);
                        l.target.parent.preds.set(curLink.source.autoId, curLink.source);
                        l.target.parent.parent.predLinks.set(curLink.autoId, curLink);
                        l.target.parent.parent.preds.set(curLink.source.autoId, curLink.source);
                    } else if (j === 0) {
                        l.source.succLinks.set(curLink.autoId, curLink);
                        l.source.succs.set(curLink.target.autoId, curLink.target);
                        l.source.parent.succLinks.set(curLink.autoId, curLink);
                        l.source.parent.succs.set(curLink.target.autoId, curLink.target);
                        l.source.parent.parent.succLinks.set(curLink.autoId, curLink);
                        l.source.parent.parent.succs.set(curLink.target.autoId, curLink.target);
                    }

                    curLink = graph.aLinks[newLinkId + j + 1];
                    j++;
                }

                /* Exclude original analysis link from aLink container. */
                l.l.gap = true;
            }
        });
    };


    /**
     * Restore links where dummy nodes were inserted in order to process the layout.
     * @param The provenance graph.
     */
    var removeDummyNodes = function (graph) {

        /* Look up helper. */
        var getANodeByAutoId = function (autoId) {
            return graph.aNodes.filter(function (d) {
                return d.autoId === autoId;
            })[0];
        };

        /* Look up helper. */
        var getALinkByAutoId = function (autoId) {
            return graph.aLinks.filter(function (d) {
                return d.autoId === autoId;
            })[0];
        };

        /* Clean up links. */
        for (var i = 0; i < graph.aLinks.length; i++) {
            var l = graph.aLinks[i];
            /* Clean source. */
            if (l.source.uuid != "dummy" && l.target.uuid == "dummy") {

                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);
                graph.aLinks.splice(i, 1);
                i--;
            }
            /* Clean target. */
            else if (l.source.uuid == "dummy" && l.target.uuid != "dummy") {
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);
                graph.aLinks.splice(i, 1);
                i--;
            }
            /* Remove pure dummy links. */
            else if (l.source.uuid == "dummy" && l.target.uuid == "dummy") {
                l.target.preds.remove(l.source.autoId);
                l.target.predLinks.remove(l.autoId);
                l.source.succs.remove(l.target.autoId);
                l.source.succLinks.remove(l.autoId);
                graph.aLinks.splice(i, 1);
                i--;
            }
        }

        /* Clean up nodes. */
        for (var j = 0; j < graph.aNodes.length; j++) {
            var n = graph.aNodes[j];

            if (n.uuid === "dummy") {
                n.preds = d3.map();
                n.succs = d3.map();
                n.predLinks = d3.map();
                n.succLinks = d3.map();

                graph.aNodes.splice(j, 1);
                j--;
            }
        }
        /* Restore links. */
        dummyPaths.forEach(function (dP) {
            var sourceId = dP.source.id,
                targetId = dP.target.id;

            dP.target.predNodes.forEach(function (pn) {
                getANodeByAutoId(targetId).preds.set(pn, getANodeByAutoId(pn));
            });
            dP.target.predNodeLinks.forEach(function (pnl) {
                getANodeByAutoId(targetId).predLinks.set(pnl, getALinkByAutoId(pnl));
            });
            dP.source.succNodes.forEach(function (sn) {
                getANodeByAutoId(sourceId).succs.set(sn, getANodeByAutoId(sn));
            });
            dP.source.succNodeLinks.forEach(function (snl) {
                getANodeByAutoId(sourceId).succLinks.set(snl, getALinkByAutoId(snl));
            });
        });
        dummyPaths = [];
    };


    /**
     * Reorder subanalysis layout to minimize edge crossings.
     * @param bclgNodes Barcyenter sorted, layered and grouped analysis nodes.
     */
    var reorderSubanalysisNodes = function (bclgNodes) {

        /* Initializations. */
        bclgNodes.forEach(function (l) {
            l.forEach(function (an) {

                /* Initialize analysis dimensions. */
                an.l.depth = 1;
                an.l.width = an.children.size();

                /* Create grid for subanalyses. */
                initNodeGrid(an);

                /* List which contains the subanalysis to reorder afterwards. */
                var colList = [];

                /* Initialize subanalysis col and row attributes. */
                an.children.values().forEach(function (san, j) {

                    /* Only one column does exist in this view. */
                    san.col = 0;
                    san.row = j;

                    /* The preceding analysis marks the fixed layer. */
                    if (!an.preds.empty()) {

                        /* Barycenter ordering. */
                        var degree = 1,
                            accRows = 0,
                            usedCoords = [],
                            delta = 0;

                        degree = san.preds.size();

                        /* Accumulate san row as well as an row for each pred. */
                        san.preds.values().forEach(function (psan) {
                            accRows += psan.row + ((psan.parent.row) ? psan.parent.row : 0);
                        });

                        /* If any subanalysis within the analysis has the same barycenter value, increase it by a small value. */
                        if (usedCoords.indexOf(accRows / degree) === -1) {
                            san.l.bcOrder = accRows / degree;
                            usedCoords.push(accRows / degree);
                        } else {
                            san.l.bcOrder = accRows / degree + delta;
                            usedCoords.push(accRows / degree + delta);
                            delta += 0.01;
                        }

                        /* Push into array to reorder afterwards. */
                        colList.push(san);
                    }

                });

                /* Sort subanalysis nodes. */
                colList.sort(function (a, b) {
                    return a.l.bcOrder - b.l.bcOrder;
                });

                /* Reorder subanalysis nodes. */
                colList.forEach(function (d, j) {
                    d.row = j;
                });

                /* Set grid. */
                an.children.values().forEach(function (san) {
                    /* Set grid cell. */
                    an.l.grid[san.col][san.row] = san;
                });

                /* Reset reorder list. */
                colList = [];
            });
        });
    };

    /**
     * Reorder workflow nodes to minimize edge crossings.
     * @param gNodes Topology sorted, layered and grouped nodes.
     * @param san Parent subanalysis.
     */
    var reorderNodes = function (gNodes, san) {

        /* Initializations. */
        gNodes.forEach(function (l,i) {

            /* List which contains the nodes to reorder afterwards. */
            var colList = [];
            l.forEach(function (n,j) {
                n.col = i;
                n.row = j;

                /* The preceding nodes marks the fixed layer. */
                if (!n.preds.empty()) {

                    /* Barycenter ordering. */
                    var degree = 1,
                        accRows = 0,
                        usedCoords = [],
                        delta = 0;

                    degree = n.preds.size();

                    /* Accumulate san row as well as an row for each pred. */
                    n.preds.values().forEach(function (pn) {
                        accRows += pn.row + ((pn.parent.row) ? pn.parent.row : 0);
                    });

                    /* If any node within the workflow has the same barycenter value, increase it by a small value. */
                    if (usedCoords.indexOf(accRows / degree) === -1) {
                        n.l.bcOrder = accRows / degree;
                        usedCoords.push(accRows / degree);
                    } else {
                        n.l.bcOrder = accRows / degree + delta;
                        usedCoords.push(accRows / degree + delta);
                        delta += 0.01;
                    }
                }
                /* Push into array to reorder afterwards. */
                colList.push(n);
            });

            /* Sort subanalysis nodes. */
            colList.sort(function (a, b) {
                return a.l.bcOrder - b.l.bcOrder;
            });

            /* Reorder subanalysis nodes. */
            colList.forEach(function (d, j) {
                d.row = j;
            });

            gNodes[i] = colList;

            /* Reset reorder list. */
            colList = [];
        });

        /* Initialize workflow dimensions. */
        san.l.depth = d3.max(san.children.values(), function (n) {
            return n.col;
        }) + 1;
        san.l.width = d3.max(san.children.values(), function (n) {
            return n.row;
        }) + 1;

        /* Init grid. */
        initNodeGrid(san);

        /* Set grid. */
        san.children.values().forEach(function (n) {
            /* Set grid cell. */
            san.l.grid[n.col][n.row] = n;
        });
    };

    /**
     * Main layout module function.
     * @param graph The main graph object of the provenance visualization.
     */
    var runLayoutPrivate = function (graph) {

        /* ANALYSIS LAYOUT. */
        /* TODO: Refine and cleanup */

        var bclgNodes = [];
        var startANodes = [];
        startANodes.push(graph.dataset);
        var tsANodes = topSortNodes(startANodes, graph.aNodes.length, graph);

        if (tsANodes !== null) {
            layerNodes(tsANodes, graph);

            /* TODO: Temporarily disabled. */
            /* Add dummy nodes. */
            //addDummyNodes(graph);

            /* Reset start nodes and removed flag. */

            startANodes = [];
            startANodes.push(graph.dataset);
            graph.aNodes.forEach(function (an) {
                an.l.ts.removed = false;
            });
            graph.aLinks.forEach(function (al) {
                al.l.ts.removed = false;
            });
            tsANodes = topSortNodes(startANodes, graph.aNodes.length, graph);

            layerNodes(tsANodes, graph);

            var gANodes = groupNodes(tsANodes);

            /* TODO: Refine and clean up. */
            bclgNodes = layoutNodes(gANodes, graph);

            /* Remove dummy nodes. */
            //removeDummyNodes(graph);

            /* Reset layout properties for links. */
            graph.aNodes.forEach(function (an) {
                an.l.ts.removed = false;
            });

            graph.links.forEach(function (l) {
                l.l.ts.removed = false;
            });

            /* SUBANALYSIS LAYOUT. */
            reorderSubanalysisNodes(bclgNodes);

            /* FILES/TOOLS LAYOUT. */
            graph.saNodes.forEach(function (san) {
                var tsNodes = topSortNodes(san.inputs.values(), san.children.size(), san);

                if (tsNodes !== null) {
                    /* Assign layers. */
                    layerNodes(tsNodes, san);

                    /* Group nodes by layer. */
                    var gNodes = groupNodes(tsNodes);

                    /* Reorder nodes. */
                    reorderNodes(gNodes, san);

                    /* TODO: Refine and cleanup. */

                    /* Init rows and visited flag. */
                    gNodes.forEach(function (gn) {
                        gn.forEach(function (n) {
                            n.visited = false;
                        });
                    });

                    /* Process layout, for each column. */
                    gNodes.forEach(function (gn) {

                        /* For each node. */
                        gn.sort(function (a, b) {
                            return a.row - b.row;
                        }).forEach(function (n) {

                            var succs = n.succs.values().filter(function (s) {
                                return  s.parent === n.parent;
                            }).sort(function (a, b) {
                                return a.row - b.row;
                            });

                            /* Split. */
                            if (succs.length > 1) {

                                /* Successors were visited before? */
                                var visited = getNumberofVisitedNodesByArray(succs),
                                    rowShift = succs.length / 2;

                                /* Shift nodes before and after the branch.
                                 * But only if there are more than one successor. */
                                if ((succs.length - visited) > 1) {
                                    shiftNodesByRows(tsNodes, rowShift, n.col, n.row);
                                    shiftNodesByRows(tsNodes, rowShift, n.col, n.row + 1);
                                }

                                var succRow = n.row - rowShift + visited;
                                succs.forEach(function (sn) {
                                    if (succs.length % 2 === 0 && succRow === n.row) {
                                        succRow++;
                                    }

                                    if (sn.visited === false) {
                                        sn.row = succRow;
                                        sn.visited = true;
                                        succRow++;
                                    }
                                });
                            } else {
                                succs.forEach(function (sn) {
                                    sn.row = n.row;
                                });
                            }
                        });
                    });


                    /* Initialize workflow dimensions. */
                    san.l.depth = d3.max(san.children.values(), function (n) {
                        return n.col;
                    }) + 1;
                    san.l.width = d3.max(san.children.values(), function (n) {
                        return n.row;
                    }) + 1;

                    /* Init grid. */
                    initNodeGrid(san);

                    /* Set grid cells. */
                    san.children.values().forEach(function (n) {
                        san.l.grid[n.col][n.row] = n;
                    });

                } else {
                    console.log("Error: Graph is not acyclic!");
                }
            });
        } else {
            console.log("Error: Graph is not acyclic!");
        }

        return bclgNodes;
    };

    /**
     * Publish module function.
     */
    return{
        runLayout: function (graph) {
            return runLayoutPrivate(graph);
        }
    };
}();