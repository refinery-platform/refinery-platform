// author: https://github.com/sluger
// title: in-progress development for the refinery provenance graph visualization

// js module pattern
provenanceVisualizationModule = function () {
    // initializations

    // node-link arrays
    var nodes = [],
        links = [],
        inputNodes = [],
        flatAnalyses = [],
        aNodes = [];

    // dom elements
    var node = Object.create(null),
        link = Object.create(null),
        analysis = Object.create(null),
        aNode = Object.create(null);

// TODO: rewrite for simple maps (https://github.com/mbostock/d3/wiki/Arrays#d3_map)
    // look up hashes
    var nodeMap = d3.map(),             // node.uuid -> node.id
        studyMap = d3.map(),
        studyAssayMap = d3.map(),
        nodePredMap = d3.map(),         // node.id -> predecessor node ids
        nodeSuccMap = d3.map(),         // node.id -> successor node ids
        nodeLinkPredMap = d3.map(),     // node.id -> predecessor link ids
        nodeLinkSuccMap = d3.map(),     // node.id -> successor link ids
        workflowAnalysisMap = d3.map(),
        analysisWorkflowMap = d3.map(),
        analysisNodeMap = d3.map(),
        nodeAnalysisMap = d3.map();

    // margin conventions
    var margin = {top: 20, right: 10, bottom: 20, left: 10};

    // canvas dimensions
    var width = window.innerWidth - margin.left - margin.right,
        height = window.innerHeight - margin.top - margin.bottom;

    var zoom = Object.create(null);

    // constants
    var r = 7,
        color = d3.scale.category20();

    // geometric zoom
    var redraw = function () {
        // translation and scaling
        canvas.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        // fix for rectangle getting translated too, doesn't work after window resize
        rect.attr("transform", "translate(" + (-(d3.event.translate[0] + margin.left) / d3.event.scale) + "," + (-(d3.event.translate[1] + margin.top) / d3.event.scale) + ")" + " scale(" + (+1 / d3.event.scale) + ")");
    };

    // main canvas drawing area
    var canvas = d3.select("#provenance-graph")
        .append("svg:svg")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("viewBox", "0 0 " + (width) + " " + (height))
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("pointer-events", "all")
        .append("svg:g")
        .call(zoom = d3.behavior.zoom().on("zoom", redraw)).on("dblclick.zoom", null)
        .append("svg:g");

    // helper rectangle to support pan & zoom
    var rect = canvas.append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .classed("brect", true);

    // reset css for all nodes
    var clearHighlighting = function () {
        d3.selectAll(".node").each(function () {
            d3.select(this).classed({"highlightedNode": false});
        });
        d3.selectAll(".link").each(function () {
            d3.select(this).classed({"highlightedLink": false});
        });
    };

    // get involved nodes for highlighting the path by current node selection
    var highlightInvolvedPath = function (nodeId, highlighted) {

        // for each predecessor
        nodePredMap[nodeId].forEach(function (p) {

            // get svg node element
            d3.select("#nodeId-" + p).classed({"highlightedNode": highlighted});

            // get svg link element
            nodeLinkPredMap[p].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            highlightInvolvedPath(p, highlighted);
        });
    };

    // shift right amount of the graph for a specific node by an amount of rows (shiftAmount)
    var traverseShift = function (nodeId, shiftAmount) {
        var cur = { o: nodes[nodeId],
            succ: nodeSuccMap[nodeId]
        };

        cur.o.row = nodes[nodeId].row + shiftAmount;

        // DFS for each successor
        if (typeof cur.succ !== "undefined") {
            nodeSuccMap[nodeId].forEach(function (s) {
                traverseShift(s, shiftAmount);
            });
        }
    };

    // group nodes by layers into a 2d array
    var groupNodesByCol = function (tNodes) {
        var layer = 10,
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
            } else if (nodes[n.id].col > layer) {
                cgtNodes[10 - nodes[n.id].col].push(nodes[n.id]);
            } else {
                k++;
                layer--;
                cgtNodes.push([]);
                cgtNodes[k].push(nodes[n.id]);
            }
        });
        return cgtNodes;
    };

    // deep copy node data structure
    var copyNode = function (node) {
        var newNode = {name: "", nodeType: "", fileType: "", uuid: "", study: "", assay: "", row: -1, col: -1, parents: [], id: -1, visited: false, doiFactor: -1, hidden: true};

        newNode.name = node.name;
        newNode.nodeType = node.nodeType;
        newNode.fileType = node.fileType;
        newNode.uuid = node.uuid;
        newNode.study = node.study;
        newNode.assay = node.assay;
        newNode.row = node.row;
        newNode.col = node.col;
        newNode.id = node.id;
        newNode.visited = node.visited;
        node.parents.forEach(function (p, i) {
            newNode.parents[i] = p;
        });
        newNode.analysis = node.analysis;
        newNode.doiFactor = node.doiFactor;
        newNode.hidden = node.hidden;

        return newNode;
    };

    // init row placement
    var initRowPlacement = function (lgNodes) {
        lgNodes.forEach(function (lg) {
            lg.forEach(function (n, i) {
                nodes[n.id].row = i;
            });
        });
    };

// TODO:
    // minimize edge crossings
    var kLayerCrossingMinimisation = function (lgNodes) {

        // for each layer, reorder nodes to minimize crossings
        lgNodes.forEach(function (lg) {

            var predMaxRow = -1;
            // for each node check potential crossing
            lg.forEach(function (n, i) {

                console.log("#########################");
                console.log("#" + n.id + " (" + n.col + "," + n.row + ")");
                console.log("Preds: ");
                console.log(nodePredMap[n.id]);
                console.log("Succs: ");
                console.log(nodeSuccMap[n.id]);
                console.log("");

                // for each node, check pred row
                if (nodePredMap[n.id].length > 0) {
                    console.log("Preds: ");

                    nodePredMap[n.id].forEach(function (p) {
                        console.log("#" + nodes[p].id + " (" + nodes[p].col + "," + nodes[p].row + ")");

                        if (nodes[p].row >= predMaxRow) {
                            console.log("CHECK: " + nodes[p].row + " > " + predMaxRow);
                            predMaxRow = nodes[p].row;
                        } else {
                            console.log("CROSSING " + nodes[p].row + " > " + predMaxRow);
                        }
                    });
                }
                console.log("");

            });
        });
    };

// TODO:
    // set row placement
    var setRowPlacement = function (lgNodes) {

    };

    // layout node columns
    var placeNodesPrototype = function (lgNodes) {

        // init row placement
        initRowPlacement(lgNodes);

        // minimize edge crossings
        kLayerCrossingMinimisation(lgNodes);

        // update row placements
        setRowPlacement(lgNodes);
    };

    // TODO: rewrite row layering, keywords: vertex ordering, and y-coordinate assignment (see hierarchical.pdf)
    // layout node columns
    var placeNodes = function (lgNodes) {
        var layer = 10,
            row = 0,
            curRow = 0,
            lastRow = 0;

        console.log(lgNodes);

        // from right to left
        lgNodes.forEach(function (lg) {

            lg.forEach(function (n) {
                var cur = { id: nodeMap[n.uuid],
                    o: nodes[nodeMap[n.uuid]],
                    pred: nodePredMap[nodeMap[n.uuid]],
                    succ: nodeSuccMap[nodeMap[n.uuid]],
                    neighbors: []
                };

                console.log("nodeInfo");
                console.log(cur.id);
                console.log(cur.pred);

                // for each successor get pred (= neighbors)
                var neighbors = [];
                if (typeof cur.succ !== "undefined" && cur.succ.length !== 0) {
                    cur.succ.forEach(function (s) {
                        nodes[s].parents.forEach(function (p) {
                            if (nodes[nodeMap[p]].id !== cur.id) {
                                neighbors.push(nodeMap[p]);
                            }
                        });
                    });
                    cur.neighbors = neighbors;
                }

                // SUCC UNDEFINED
                if (typeof cur.succ === "undefined") {
                    // PRED DEFINED
                    if (typeof cur.pred !== "undefined") {
                        // 1 PRED
                        if (cur.pred.length === 1) {
                            curRow = row;
                            row++;
                        }
                        // n PRED
                        else {
                        }
                    }
                    // PRED UNDEFINED
                    else {
                        curRow = row;
                    }
                }
                // SUCC DEFINED
                else {
                    var minRow;
                    var maxRow;
                    var visited;

                    // PRED DEFINED
                    if (typeof cur.pred !== "undefined") {

                        // 1 PRED 1 SUCC
                        if (cur.pred.length === 1 && cur.succ.length === 1) {
                            console.log("1 x 1");
                            console.log(n.id);
                            // 0 NEIGHBORS
                            if (cur.neighbors.length === 0) {
                                curRow = nodes[cur.succ[0]].row;
                            } else {
                                // n NEIGHBORS
                                // check neighbors visited
                                visited = 0;
                                cur.neighbors.forEach(function (nb) {
                                    if (nodes[nb].visited) {
                                        visited++;
                                    }
                                });
                                curRow = nodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
                            }
                        }
                        // 1 PRED n SUCC
                        else if (cur.pred.length === 1 && cur.succ.length > 1) {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;
                            console.log("1 x n");
                            console.log(n.id);

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });

                            console.log("min " + minRow + " max " + maxRow);
                            if ((minRow + (maxRow - minRow) / 2) === curRow) {
                                curRow += (minRow + (maxRow - minRow) / 2);
                            } else {
                                curRow = minRow + (maxRow - minRow) / 2;
                            }
                            // quick fix

                            // 0 NEIGHBORS
                            if (cur.neighbors.length === 0) {
                                curRow = minRow + (maxRow - minRow) / 2;
                            } else {
                                // n NEIGHBORS
                                // check neighbors visited
                                visited = 0;
                                cur.neighbors.forEach(function (nb) {
                                    if (nodes[nb].visited) {
                                        visited++;
                                    }
                                });
                                curRow = nodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
                            }

                            if (curRow === lastRow) {
                                console.log("collision");
                                curRow += 1;
                            }
                        }
                        // n PRED 1 SUCC
                        else if (cur.pred.length > 1 && cur.succ.length === 1) {
                            curRow = nodes[cur.succ[0]].row + cur.pred.length / 2;

                            // traverse graph and shift succs by row_shift
                            traverseShift(cur.succ[0], cur.pred.length / 2 + 2);
                        }
                        // n PRED n SUCC
                        else {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;
                            console.log("n x n");

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });

                            // 0 NEIGHBORS
                            if (cur.neighbors.length === 0) {
                                curRow = minRow + (maxRow - minRow) / 2;
                            } else {
                                // n NEIGHBORS
                                // check neighbors visited
                                visited = 0;
                                cur.neighbors.forEach(function (nb) {
                                    if (nodes[nb].visited) {
                                        visited++;
                                    }
                                });
                                curRow = nodes[cur.succ[0]].row - (cur.neighbors.length / 2) + visited;
                            }
                        }
                    }
                    // PRED UNDEFINED
                    else {
                        // 1 SUCC
                        if (cur.succ.length === 1) {
                            curRow = nodes[cur.succ[0]].row;
                        }
                        // n SUCC
                        else {
                            minRow = nodes[cur.succ[0]].row;
                            maxRow = -1;

                            // get min and max row for SPLIT BRANCH
                            cur.succ.forEach(function (s) {
                                if (nodes[s].row < minRow) {
                                    minRow = nodes[s].row;
                                }
                                if (nodes[s].row > maxRow) {
                                    maxRow = nodes[s].row;
                                }
                            });

                            curRow = minRow + (maxRow - minRow) / 2;
                        }
                    }
                }
                console.log(nodes[n.id].row + "<-" + curRow);
                nodes[n.id].row = curRow;
                cur.o.visited = true;
                lastRow = curRow;
            });
            layer--;
            row = 0;
        });
    };

// TODO: code cleanup
    // add dummy vertices
    var addDummyVertices = function () {
        links.forEach(function (l) {
            // when the link is longer than one column, add dummy vertices
            var gapLength = nodes[l.target].col - nodes[l.source].col;

            if (gapLength > 1) {

                // dummy nodes are affiliated with the source node of the link in context
                var newNodeId = nodes.length,
                    newLinkId = links.length,
                    predNode = l.source,
                    curCol = nodes[l.source].col,
                    curAnalysis = nodes[l.source].analysis,
                    curStudy = nodes[l.source].study,
                    curAssay = nodes[l.source].assay;

                // insert nodes
                var i = 0;
                while (i < gapLength - 1) {

                    // add node
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
                        visited: false,
                        analysis: curAnalysis,
                        doiFactor: -1,
                        hidden: true
                    });

                    // update node maps
                    createNodeHashes(nodes[newNodeId + i], newNodeId + i);

                    //analysisNodeMap = ,
                    nodeAnalysisMap[newNodeId + i] = curAnalysis;

                    predNode = newNodeId + i;
                    curCol++;
                    i++;
                }

                // update parents for original target node
                nodes[l.target].parents = nodes[l.target].parents.concat([nodes[predNode].uuid]);
                nodes[l.target].parents.splice(nodes[l.target].parents.indexOf(nodes[l.source].uuid), 1);

                // insert links (one link more than nodes)
                predNode = l.source;
                curCol = nodes[l.source].col;

                // update original link source
                nodeLinkSuccMap[l.source] = nodeLinkSuccMap[l.source].concat([newLinkId]);
                nodeLinkSuccMap[l.source].splice(nodeLinkSuccMap[l.source].indexOf(l.id), 1);
                nodeSuccMap[l.source] = nodeSuccMap[l.source].concat([newNodeId]);
                nodeSuccMap[l.source].splice(nodeSuccMap[l.source].indexOf(l.target), 1);

                /*console.log("source: " + l.source);
                 console.log("target: " + l.target);*/

                var j = 0;
                while (j < gapLength) {
                    /*console.log("j: " + j);
                     console.log("predNode: " + predNode);
                     console.log("newNodeId: " + (newNodeId + j));
                     console.log("newLinkId: " + (newLinkId + j));*/

                    // add link
                    links.push({
                        source: predNode,
                        target: (j === gapLength - 1) ? l.target : newNodeId + j,
                        id: newLinkId + j,
                        hidden: true
                    });

                    if (j < gapLength - 1) {
                        nodePredMap[newNodeId + j] = [predNode];
                        nodeLinkPredMap[newNodeId + j] = [newLinkId + j];
                        //nodeSuccMap[newNodeId + j] = [newNodeId + j+1];
                        nodeLinkSuccMap[newNodeId + j] = [newLinkId + j + 1];
                    }

                    // update link maps
                    if (j < gapLength - 2) {
                        nodeSuccMap[newNodeId + j] = [newNodeId + j + 1];
                        //nodeLinkSuccMap[newNodeId + j] = [newLinkId + j+1];
                    }

                    predNode = newNodeId + j;
                    curCol++;
                    j++;
                }
                nodeLinkPredMap[l.target] = nodeLinkPredMap[l.target].concat([newLinkId + j - 1]);
                nodeLinkPredMap[l.target].splice(nodeLinkPredMap[l.target].indexOf(l.id), 1);
                nodePredMap[l.target] = nodePredMap[l.target].concat([newNodeId + j - 2]);
                nodePredMap[l.target].splice(nodePredMap[l.target].indexOf(l.source), 1);

                // delete original link
                links[l.id] = null;

                /*console.log("REMOVE LINK HASH DEPENDENCIES");
                 console.log(nodeLinkPredMap);
                 console.log(nodeLinkSuccMap);
                 console.log(nodePredMap);
                 console.log(nodeSuccMap);

                 console.log("links");
                 console.log(links);*/
            }
        });
    };

    // layering
    var assignLayers = function (tNodes) {
        var layer = 10,
            succ = [],
            rtNodes = [];

        tNodes.forEach(function (d) {
            rtNodes.push(copyNode(d));
        });

        rtNodes.reverse().forEach(function (n) {
            // get outgoing neighbor
            succ = nodeSuccMap[nodeMap[n.uuid]];

            if (typeof succ === "undefined") {
                nodes[n.id].col = layer;
                n.col = layer;
            } else {
                var maxSuccLayer = layer;
                succ.forEach(function (s) {
                    if (nodes[s].col < maxSuccLayer) {
                        maxSuccLayer = nodes[s].col;
                    }
                });
                nodes[n.id].col = maxSuccLayer - 1;
                n.col = maxSuccLayer - 1;
            }
        });
        /*        var str = "";
         rtNodes.forEach(function (ll) {
         str += nodes[ll.id].id + "(" + nodes[ll.id].col + ") ";
         });
         console.log("layering: " + str);*/
    };

    // TODO: lexicographic sort for each layer
    // linear time topology sort [Kahn 1962] (http://en.wikipedia.org/wiki/Topological_sorting)
    var sortTopological = function (inputs) {
        var s = [],     // input set
            l = [],     // result set for sorted elements
            cNodes = [],// deep copy nodes, because we have to delete links from the graph
            n = Object.create(null);

        // deep copy arrays by value
        inputs.forEach(function (inNode) {
            s.push(copyNode(inNode));
        });
        nodes.forEach(function (selNode) {
            cNodes.push(copyNode(selNode));
        });

        // to avoid definition of function in while loop below (added by NG)
        // for each successor
        var handleUndefined = function (m) {
            // delete parent with p.uuid == n.uuid
            var index = -1;
            // for each parent (predecessor), remove edge n->m
            cNodes[m].parents.forEach(function (p, i) {
                if (p == n.uuid) {
                    index = i;
                }
            });
            // if parent of successor equals n, delete edge
            if (index > -1) {
                cNodes[m].parents.splice(index, 1);
            }
            // if there are no edges left, insert m into s
            if (cNodes[m].parents.length === 0) {
                s.push(cNodes[m]);
            }
            // else, current successor has other parents to be processed first
        };

        // while the input set is not empty
        while (s.length > 0) {
            n = s.shift();  // remove first item n
            l.push(n);      // and push it into result set

            // get successor node set for n
            var succ = nodeSuccMap[nodeMap[n.uuid]];

            if (typeof succ !== "undefined") {
                succ.forEach(handleUndefined);
            }
        }
        /*var str = "";
         l.forEach(function (ll) {
         str += ll.id + " ";
         });
         console.log("TopSort: " + str);*/
        // handle non-acyclic graphs
        if (s.length > 0) {
            return null;
        } else {
            return l;
        }
    };

    // extract nodes
    var extractNodes = function (datasetJsonObj) {
        d3.values(datasetJsonObj.value).forEach(function (x, i) {

            // assign class string for node types
            var nodeType = assignCSSNodeType(x.type);

            // extract node properties from api
            extractNodeProperties(x, nodeType, i);

            // build node hashes
            createNodeHashes(x, i);

            // sorted set of input nodes
            if (x.type == "Source Name") {
                inputNodes.push(nodes[i]);
            }
        });
    };

    // extract links
    var extractLinks = function () {
        var linkId = 0;
        nodes.forEach(function (x, i) { // x may be parent of y
            if (typeof x.uuid !== "undefined" && typeof x.parents !== "undefined") {
                var srcNodeIds = [],
                    srcLinkIds = [];

                // for each parent entry
                x.parents.forEach(function (z, k) {

                    // extractLinkProperties
                    extractLinkProperties(x, linkId, k);

                    // build link hashes
                    createLinkHashes(z, linkId, i, srcNodeIds, srcLinkIds);
                    linkId++;

                });
                nodeLinkPredMap[i] = srcLinkIds;
                nodePredMap[i] = srcNodeIds;
            }
        });
    };

    // extractLinkProperties
    var extractLinkProperties = function (nodeElem, linkId, parentIndex) {
        links.push({
            source: nodeMap[nodeElem.parents[parentIndex]],
            target: nodeMap[nodeElem.uuid],
            id: linkId,
            hidden: true
        });
    };

    // create one node representing the whole analysis when aggregated
    var createAnalysisNodes = function () {
        aNodes.push({"uuid": "dataset", "row": -1, "col": -1, "hidden": false, "id": 0, "start": -1, "end": -1, "created": -1, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": [], "predAnalyses": [], "succAnalyses": []});

        analyses.objects.forEach(function (a, i) {
            aNodes.push({"uuid": a.uuid, "row": -1, "col": -1, "hidden": false, "id": i + 1, "start": a.time_start, "end": a.time_end, "created": a.creation_date, "doiFactor": -1, "nodes": [], "inputNodes": [], "outputNodes": [], "predAnalyses": [], "succAnalyses": []});
        });
    };

    // build link hashes
    var createLinkHashes = function (parentNodeElem, linkId, nodeId, srcNodeIds, srcLinkIds) {
        srcNodeIds.push(nodeMap[parentNodeElem]);
        srcLinkIds.push(linkId);

        if (nodeSuccMap.hasOwnProperty(nodeMap[parentNodeElem])) {
            nodeSuccMap[nodeMap[parentNodeElem]] = nodeSuccMap[nodeMap[parentNodeElem]].concat([nodeId]);
            nodeLinkSuccMap[nodeMap[parentNodeElem]] = nodeLinkSuccMap[nodeMap[parentNodeElem]].concat([linkId]);
        } else {
            nodeSuccMap[nodeMap[parentNodeElem]] = [nodeId];
            nodeLinkSuccMap[nodeMap[parentNodeElem]] = [linkId];
        }
    };

    // build node hashes
    var createNodeHashes = function (nodeObj, nodeIndex) {
        nodeMap[nodeObj.uuid] = nodeIndex;
        studyMap[nodeIndex] = nodes[nodeIndex].study;
        studyAssayMap[nodes[nodeIndex].study] = nodes[nodeIndex].assay;
    };

    // extract node api properties
    var extractNodeProperties = function (nodeObj, nodeType, nodeIndex) {
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
            id: nodeIndex,
            visited: false,
            analysis: (nodeObj.analysis_uuid !== null) ? nodeObj.analysis_uuid : "dataset",
            doiFactor: -1,
            hidden: true
        });
    };

    // assign CSS class for node types
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

    // for each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it
    var createAnalysisNodeMapping = function () {
        nodes.forEach(function (n, i) {
            if (analysisNodeMap.hasOwnProperty(n.analysis)) {
                analysisNodeMap[n.analysis] = analysisNodeMap[n.analysis].concat([i]);
            } else {
                analysisNodeMap[n.analysis] = [i];
            }
        });

        aNodes.forEach(function (an) {
            an.nodes = analysisNodeMap[an.uuid].map(function (d) {
                nodeAnalysisMap[d] = an.id;
                return nodes[d]; // flatten nodes objects
            });

            // set input nodes
            an.inputNodes = an.nodes.filter(function (n) {
                return nodePredMap[n.id].some(function (p) {
                    return nodes[p].analysis != an.uuid;
                }) || nodePredMap[n.id].length === 0; // if no src analyses exists
            });

            // set output nodes
            an.outputNodes = an.nodes.filter(function (n) {
                return typeof nodeSuccMap[n.id] === "undefined" || nodeSuccMap[n.id].some(function (s) {
                    return nodes[s].analysis != an.uuid;
                });
            });
        });

        aNodes.forEach(function (an) {
            // set predecessor analyses
            if (an.uuid != "dataset") {
                an.inputNodes.forEach(function (n) {
                    nodePredMap[n.id].forEach(function (pn) {
                        if (an.predAnalyses.indexOf(nodeAnalysisMap[pn]) === -1) {
                            an.predAnalyses.push(nodeAnalysisMap[pn]);
                        }
                    });
                });
            }

            // set successor analyses
            an.outputNodes.forEach(function (n) {
                if (typeof nodeSuccMap[n.id] !== "undefined") {
                    nodeSuccMap[n.id].forEach(function (s) {
                        if (an.succAnalyses.indexOf(nodeAnalysisMap[s]) === -1) {
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

    // extract workflows from analyses
    // a workflow might be executed by multiple analyses
    var createWorkflowAnalysisMapping = function () {
        analyses.objects.forEach(function (a) {
            // workflow -> analysis
            if (workflowAnalysisMap.hasOwnProperty(a.workflow__uuid)) {
                workflowAnalysisMap[a.workflow__uuid] = workflowAnalysisMap[a.workflow__uuid].concat([a.uuid]);
            } else {
                workflowAnalysisMap[a.workflow__uuid] = [a.uuid];
            }

            // analysis -> workflow
            analysisWorkflowMap[a.uuid] = a.workflow__uuid;
        });

        flatAnalyses = [].concat.apply(["dataset"], d3.values(workflowAnalysisMap));
    };

    // set coordinates for nodes
    var assignGridCoordinates = function () {
        nodes.forEach(function (d) {
            d.x = d.col * 50 + 100;
            d.y = d.row * 50 + 100;
        });
    };

    // creates analysis group dom elements which then contain the nodes and links of an analysis
    var createAnalysisLayers = function () {
        var aId = 0;
        // add analyses dom groups
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

    // drag start listener support for nodes
    var dragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    // drag listener
    var dragging = function (d) {
        // drag selected node
        d3.select(this).attr("transform", function (n) {
            switch (n.nodeType) {
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

        // drag adjacent links

        // get input links
        // update coordinates for x2 and y2
        nodeLinkPredMap[d.id].forEach(function (l) {
            d3.select("#linkId-" + l).attr("x2", d3.event.x);
            d3.select("#linkId-" + l).attr("y2", d3.event.y);
        });

        // get output links
        // update coordinates for x1 and y1
        if (typeof nodeLinkSuccMap[d.id] !== "undefined") {
            nodeLinkSuccMap[d.id].forEach(function (l) {
                d3.select("#linkId-" + l).attr("x1", d3.event.x);
                d3.select("#linkId-" + l).attr("y1", d3.event.y);
            });
        }

        // update data
        d.x = d3.event.x;
        d.y = d3.event.y;
    };

    // drag end listener
    var dragEnd = function () {
    };

    var applyDragBehavior = function () {
        // drag and drop node enabled
        var drag = d3.behavior.drag()
            .on("dragstart", dragStart)
            .on("drag", dragging)
            .on("dragend", dragEnd);

        // invoke dragging behavior on nodes
        d3.selectAll(".node").call(drag);
    };

    // drag start listener support for nodes
    var analysisDragStart = function () {
        d3.event.sourceEvent.stopPropagation();
    };

    // drag listener
    var analysisDragging = function (an) {
        // drag selected node
        d3.select(this).attr("transform", function () {
            return "translate(" + d3.event.x + "," + d3.event.y + ")";
        });

        // update dom element
        an.predAnalyses.forEach(function (pan) {
            aNodes[pan].outputNodes.forEach(function (n) {
                if (typeof nodeLinkSuccMap[n.id] !== "undefined") {
                    nodeLinkSuccMap[n.id].forEach(function (l) {
                        if (nodeAnalysisMap[links[l].target] == an.id) {
                            d3.select("#linkId-" + l).attr("x2", d3.event.x);
                            d3.select("#linkId-" + l).attr("y2", d3.event.y);
                        }
                    });
                }
            });
        });

        an.succAnalyses.forEach(function (san) {
            aNodes[san].inputNodes.forEach(function (n) {
                nodeLinkPredMap[n.id].forEach(function (l) {
                    d3.select("#linkId-" + l).attr("x1", d3.event.x);
                    d3.select("#linkId-" + l).attr("y1", d3.event.y);
                });
            });
        });

        // update data
        an.x = d3.event.x;
        an.y = d3.event.y;
    };

    // drag end listener
    var analysisDragEnd = function () {
    };

    var applyAnalysisDragBehavior = function () {
        // drag and drop node enabled
        var analysisDrag = d3.behavior.drag()
            .on("dragstart", analysisDragStart)
            .on("drag", analysisDragging)
            .on("dragend", analysisDragEnd);

        // invoke dragging behavior on nodes
        d3.selectAll(".aNode").call(analysisDrag);
    };

    // dye graph by analyses and its corresponding workflows
    var dyeWorkflows = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("stroke", function (d) {
                return color(analysisWorkflowMap[d.analysis]);
            });
        });

    };

    // dye graph by analyses
    var dyeAnalyses = function () {
        d3.selectAll(".rawNode, .specialNode, .dtNode, .processedNode").each(function () {
            d3.select(this).style("fill", function (d) {
                return color(d.analysis);
            });
        });

    };

// TODO: DEBUG: QUICK FIX FOR DEMONSTRATION: as coordinates for anodes do not exist yet without the layout adaption, center it to the analyses
    // create inital layout for analysis only nodes
    var initAnalysisLayout = function () {
        aNodes.forEach(function (an) {
            // get min and max column/row of nodes to center new analysis process node
            var min = [d3.min(nodes.filter(function (n) {
                    return n.analysis == an.uuid;
                }), function (d) {
                    return d.x;
                }), d3.min(nodes.filter(function (n) {
                    return n.analysis == an.uuid;
                }), function (d) {
                    return d.y;
                })],
                max = [d3.max(nodes.filter(function (n) {
                    return n.analysis == an.uuid;
                }), function (d) {
                    return d.x;
                }), d3.max(nodes.filter(function (n) {
                    return n.analysis == an.uuid;
                }), function (d) {
                    return d.y;
                })];
            var delta = {x: min[0] + (max[0] - min[0]) / 2, y: min[1] + (max[1] - min[1]) / 2};

            an.x = delta.x;
            an.y = delta.y;
        });
    };

    // set display property of analysis connecting links
    var initLinkVisibility = function () {
        aNodes.forEach(function (an) {
            an.predAnalyses.forEach(function (pan) {
                aNodes[pan].outputNodes.forEach(function (n) {
                    if (typeof nodeLinkSuccMap[n.id] !== "undefined") {
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

    // draw links
    var drawLinks = function () {
        link = canvas.selectAll(".link")
            .data(links.filter(function (l) {
                return l !== null;
            }))
            .enter().append("line")
            .attr("x1", function (l) {
                return l.hidden ? nodes[l.source].x : aNodes[nodeAnalysisMap[l.source]].x;
            })
            .attr("y1", function (l) {
                return l.hidden ? nodes[l.source].y : aNodes[nodeAnalysisMap[l.source]].y;
            })
            .attr("x2", function (l) {
                return l.hidden ? nodes[l.target].x : aNodes[nodeAnalysisMap[l.target]].x;
            })
            .attr("y2", function (l) {
                return l.hidden ? nodes[l.target].y : aNodes[nodeAnalysisMap[l.target]].y;
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
// TODO: FIX: in certain cases, tooltips collide with canvas bounding box
        // create d3-tip tooltips
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (l) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + l.id + "</span><br>" +
                    "<strong>Source Id:</strong> <span style='color:#fa9b30'>" + l.source + "</span><br>" +
                    "<strong>Target Id:</strong> <span style='color:#fa9b30'>" + l.target + "</span>";
            });

        // invoke tooltip on dom element
        link.call(tip);
        link.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    // draw analysis nodes
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
                        /*.append("ellipse")
                         .attr("rx", r * 3)
                         .attr("ry", r * 2)*/
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

        // set node dom element
        aNode = d3.selectAll(".aNode");

        // create d3-tip tooltips
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return d.id === 0 ? "<span style='color:#fa9b30'>Original Dataset</span><br><strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" :
                    "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                        "<strong>Start:</strong> <span style='color:#fa9b30'>" + d.start + "</span><br>" +
                        "<strong>End:</strong> <span style='color:#fa9b30'>" + d.end + "</span>";
            });

        // invoke tooltip on dom element
        aNode.call(tip);
        aNode.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };

    // draw nodes
    var drawNodes = function () {
        analysis.each(function (a, i) {
            d3.select(this).selectAll(".node")
                .data(nodes.filter(function (n) {
                    return nodeAnalysisMap[n.id] == i;
                }))
                .enter().append("g").each(function (d) {
                    if (d.nodeType === "raw" || d.nodeType === "processed") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", r);
                    } else if (d.nodeType === "dummy") {
                        d3.select(this)
                            .attr("transform", "translate(" + d.x + "," + d.y + ")")
                            .append("circle")
                            .attr("r", r / 2);
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
                        return d.nodeType == "raw";
                    }),
                    "dummyNode": (function (d) {
                        return d.nodeType == "dummy";
                    }),
                    "specialNode": (function (d) {
                        return d.nodeType == "special";
                    }),
                    "dtNode": (function (d) {
                        return d.nodeType == "dt";
                    }),
                    "processedNode": (function (d) {
                        return d.nodeType == "processed";
                    })
                }).attr("id", function (d) {
                    return "nodeId-" + d.id;
                }).style("display", function (d) {
                    return d.hidden ? "none" : "inline";
                });
        });

        // set node dom element
        node = d3.selectAll(".node");

        // create d3-tip tooltips
        var tip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-10, 0])
            .html(function (d) {
                return "<strong>Id:</strong> <span style='color:#fa9b30'>" + d.id + "</span><br>" +
                    "<strong>Name:</strong> <span style='color:#fa9b30'>" + d.name + "</span><br>" +
                    "<strong>Type:</strong> <span style='color:#fa9b30'>" + d.fileType + "</span>";
            });

        // invoke tooltip on dom element
        node.call(tip);
        node.on("mouseover", tip.show)
            .on("mouseout", tip.hide);
    };


// TODO: code cleanup
    var handleCollapseExpandAnalysis = function () {
        d3.selectAll(".analysis").on("dblclick", function () {
            var an = aNodes[+d3.select(this).attr("id").replace(/(aId-)/g, "")];

            // expand
            if (!an.hidden) {
                d3.select(this).selectAll(".node").style("display", "inline");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "inline");
                });
                d3.select(this).select(".aNode").style("display", "none");

                // set node visibility
                an.hidden = true;
                an.nodes.forEach(function (n) {
                    n.hidden = false;
                });

                // adapt incoming links
                an.predAnalyses.forEach(function (pan) {
                    aNodes[pan].outputNodes.forEach(function (n) {
                        if (typeof nodeLinkSuccMap[n.id] !== "undefined") {
                            nodeLinkSuccMap[n.id].forEach(function (l) {
                                if (nodeAnalysisMap[links[l].target] == an.id) {
                                    d3.select("#linkId-" + l).style("display", "inline").attr("x2", nodes[links[l].target].x);
                                    d3.select("#linkId-" + l).style("display", "inline").attr("y2", nodes[links[l].target].y);
                                }
                            });
                        }
                    });
                });

                // adapt outgoing links
                an.succAnalyses.forEach(function (san) {
                    aNodes[san].inputNodes.forEach(function (n) {
                        nodeLinkPredMap[n.id].forEach(function (l) {
                            if (nodeAnalysisMap[links[l].source] == an.id) {
                                d3.select("#linkId-" + l).style("display", "inline").attr("x1", nodes[links[l].source].x);
                                d3.select("#linkId-" + l).style("display", "inline").attr("y1", nodes[links[l].source].y);
                            }
                        });
                    });
                });

                // collapse
            } else {
                d3.select(this).selectAll(".node").style("display", "none");
                an.links.forEach(function (l) {
                    d3.select("#linkId-" + l.id).style("display", "none");
                });
                d3.select(this).select(".aNode").style("display", "inline");

                an.hidden = false;
                an.nodes.forEach(function (n) {
                    n.hidden = true;
                });

                // adapt incoming links
                an.predAnalyses.forEach(function (pan) {
                    aNodes[pan].outputNodes.forEach(function (n) {
                        if (typeof nodeLinkSuccMap[n.id] !== "undefined") {
                            nodeLinkSuccMap[n.id].forEach(function (l) {
                                if (nodeAnalysisMap[links[l].target] == an.id) {
                                    d3.select("#linkId-" + l).style("display", "inline").attr("x2", an.x);
                                    d3.select("#linkId-" + l).style("display", "inline").attr("y2", an.y);
                                }
                            });
                        }
                    });
                });

                // adapt outgoing links
                an.succAnalyses.forEach(function (san) {
                    aNodes[san].inputNodes.forEach(function (n) {
                        nodeLinkPredMap[n.id].forEach(function (l) {
                            if (nodeAnalysisMap[links[l].source] == an.id) {
                                d3.select("#linkId-" + l).style("display", "inline").attr("x1", an.x);
                                d3.select("#linkId-" + l).style("display", "inline").attr("y1", an.y);
                            }
                        });
                    });
                });

            }
        });
    };

    // path highlighting
    var handlePathHighlighting = function () {
        d3.selectAll(".node").on("click", function (x) {
            var highlighted = true;

            // suppress after dragend
            if (d3.event.defaultPrevented) return;

            // clear any highlighting
            clearHighlighting();

            // highlight selected node and links
            d3.select(this).classed({"highlightedNode": true});
            nodeLinkPredMap[x.id].forEach(function (l) {
                d3.select("#linkId-" + l).classed({"highlightedLink": highlighted});
            });

            // highlight path
            highlightInvolvedPath(x.id, highlighted);
        });
    };

    // fit visualization onto free windows space
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

        // background rectangle fix
        rect.attr("transform", "translate(" + (-newPos[0] / newScale) + "," + (-newPos[1] / newScale) + ")" + " scale(" + (+1 / newScale) + ")");
    };

    // wrapper function to invoke scale and transformation onto the visualization
    var handleFitGraphToWindow = function () {
        fitGraphToWindow(1000);
    };

// TODO: FIX: on double click, click action is executed
    // click and double click separation on background rectangle
    var handleBRectClick = function () {
        var clickInProgress = false, // click in progress
            timer = 0,
            bRectAction = clearHighlighting;	// default action

        d3.select(".brect").on("click", function () {
            // suppress after drag end
            if (d3.event.defaultPrevented) return;

            // if double click, break
            if (clickInProgress) {
                return;
            }

            clickInProgress = true;
            // single click event is called after timeout unless a dblick action is performed
            timer = setTimeout(function () {
                bRectAction();	// called always

                bRectAction = clearHighlighting; // set back click action to single
                clickInProgress = false;
            }, 200); // timeout value
        });

        // if double click, the single click action is overwritten
        d3.select(".brect").on("dblclick", function () {
            bRectAction = handleFitGraphToWindow;
        });
    };

    // event listeners
    var handleEvents = function () {
        // path highlighting
        handlePathHighlighting();

        // handle click separation
        handleBRectClick();

        // handle analysis aggregation
        handleCollapseExpandAnalysis();
    };

    // main d3 visualization function
    var drawGraph = function () {

        // short delay
        setTimeout(function () {

            // set coordinates for nodes
            assignGridCoordinates();

            // create initial layout for analysis only nodes
            initAnalysisLayout();

            // draw links
            drawLinks();

            // create analysis group layers
            createAnalysisLayers();

            // draw nodes
            drawNodes();

            // draw analysis nodes
            drawAnalysisNodes();

            // set initial graph position
            fitGraphToWindow(0);

            // colorize graph
            dyeWorkflows();
            dyeAnalyses();

            // add dragging behavior to nodes
            applyDragBehavior();

            // add dragging behavior to analysis nodes
            applyAnalysisDragBehavior();

            // event listeners
            handleEvents();

            // fade in
            d3.selectAll(".link").transition().duration(500).style("opacity", 1.0);
            d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
        }, 500);
    };

// TODO: remove/rewrite
    // layout graph
    var layout = function () {
        // topological order
        var topNodes = sortTopological(inputNodes);

        if (topNodes !== null) {
            // assign layers
            assignLayers(topNodes);

            // group nodes by layer
            var layeredTopNodes = groupNodesByCol(topNodes);

            // place vertices
            placeNodesPrototype(layeredTopNodes);
        } else {
            console.log("Error: Graph is not acyclic!");
        }
    };

    // refinery injection for the provenance visualization
    var runProvenanceVisualizationPrivate = function (studyUuid) {
        var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0";

        // parse json
        d3.json(url, function (error, data) {

            // extract raw objects
            var obj = d3.entries(data)[1];

            // create node collection
            extractNodes(obj);

            // create link collection
            extractLinks();

            // create analyses and workflow hashes
            createWorkflowAnalysisMapping();

            // extract analysis nodes
            createAnalysisNodes();

// TODO: add dummy vertices and links
            // topological order
            var topNodes = sortTopological(inputNodes);

            if (topNodes !== null) {
                // assign layers
                assignLayers(topNodes);

                // add dummy vertices and links
                addDummyVertices();

                // create analysis node mapping
                createAnalysisNodeMapping();

                // set display property of analysis connecting links
                initLinkVisibility();

                // group nodes by layer
                var layeredTopNodes = groupNodesByCol(topNodes);

                // place vertices
                placeNodesPrototype(layeredTopNodes);

                // call d3 visualization
                drawGraph();
            } else {
                console.log("Error: Graph is not acyclic!");
            }
        });
    };

    // publish public function
    return{
        runProvenanceVisualization: function (studyUuid) {
            runProvenanceVisualizationPrivate(studyUuid);
        }
    };
}();