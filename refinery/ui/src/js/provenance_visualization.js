// author: https://github.com/sluger
// title: prototype implementation for the refinery provenance visualization api

// initializations

// node-link arrays
var nodes = [],
    inputNodes = [],
    links = [];

// dom elements
var node = null,
    link = null;

// look up hashes
var nodeHash = [],
    studyHash = [],
    studyAssayHash = [],
    srcLinkHash = [],
    tarLinkHash = [];

// canvas dimensions
var width = window.innerWidth - 50,
    height = window.innerHeight - 50;

// primitive dimensions
var r = 6;

// main canvas drawing area
var canvas = d3.select("#provenance-graph")
    .append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .attr("pointer-events", "all")
    .append("svg:g")
    .call(d3.behavior.zoom().on("zoom", redraw))
    .append("svg:g");

// helper rectangle to support pan & zoom
var rect = canvas.append('svg:rect')
    .attr("width", width)
    .attr("height", height)
    .classed("brect", true);

// initialize force layout
var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

// drag and drop node enabled
drag = force.drag()
    .on("dragstart", dragstart)
    .on("dragend", dragend);

// shift right amount of the graph for a specific node by an amount of rows (shiftAmount)
function traverseShift(nodeId, shiftAmount) {
    var cur = { o: nodes[nodeId],
        succ: tarLinkHash[nodeId]
    };

    cur.o.row = nodes[nodeId].row + shiftAmount;

    // DFS for each successor
    if (typeof cur.succ !== "undefined") {
        tarLinkHash[nodeId].forEach(function (s) {
            traverseShift(s, shiftAmount);
        });
    }
}

// group nodes by layers into a 2d array
function groupNodesByCol(tNodes) {
    var layer = 10,
        cgtNodes = [],
        rtNodes = [];

    tNodes.forEach(function (d) {
        rtNodes.push(copyNode(d));
    });

    cgtNodes.push([]);
    var i = 0;
    rtNodes.reverse().forEach(function (n) {
        if (nodes[n.id].col === layer) {
            cgtNodes[i].push(nodes[n.id]);
        } else {
            i++;
            layer--;
            cgtNodes.push([]);
            cgtNodes[i].push(nodes[n.id]);
        }
    });

    return cgtNodes;
}

// deep copy node data structure
function copyNode(node) {
    var newNode = {name: "", nodeType: "", uuid: "", study: "", assay: "", fixed: false, row: -1, col: -1, parents: [], id: -1, visited: false};

    newNode.name = node.name;
    newNode.nodeType = node.nodeType;
    newNode.uuid = node.uuid;
    newNode.study = node.study;
    newNode.assay = node.assay;
    newNode.fixed = node.fixed;
    newNode.row = node.row;
    newNode.col = node.col;
    newNode.id = node.id;
    newNode.visited = node.visited;
    node.parents.forEach(function (p, i) {
        newNode.parents[i] = p;
    });

    return newNode;
}

// TODO: rewrite row layering
// layout node columns
function placeNodes(lgNodes) {
    var layer = 10,
        row = 0,
        curRow = 0;

    // from right to left
    lgNodes.forEach(function (lg) {

        lg.forEach(function (n) {
            var cur = { id: nodeHash[n.uuid],
                o: nodes[nodeHash[n.uuid]],
                pred: srcLinkHash[nodeHash[n.uuid]],
                succ: tarLinkHash[nodeHash[n.uuid]],
                neighbors: []
            };

            // for each successor get pred (= neighbors)
            var neighbors = [];
            if (typeof cur.succ !== "undefined") {
                cur.succ.forEach(function (s) {
                    nodes[s].parents.forEach(function (p) {
                        if (nodes[nodeHash[p]].id !== cur.id) {
                            neighbors.push(nodeHash[p]);
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

                        // get min and max row for SPLIT BRANCH
                        cur.succ.forEach(function (s) {
                            if (nodes[s].row < minRow) {
                                minRow = nodes[s].row;
                            }
                            if (nodes[s].row > maxRow) {
                                maxRow = nodes[s].row;
                            }
                        });
                        if ((minRow + (maxRow - minRow) / 2) === curRow) {
                            curRow += curRow;
                        } else {
                            curRow = minRow + (maxRow - minRow) / 2;
                        }
                    }
                    // n PRED 1 SUCC
                    else if (cur.pred.length > 1 && cur.succ.length === 1) {
                        curRow = nodes[cur.succ[0]].row + cur.pred.length / 2;

                        // traverse graph and shift succs by row_shift
                        traverseShift(cur.succ[0], cur.pred.length / 2);
                    }
                    // n PRED n SUCC
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
            nodes[n.id].row = curRow;
            cur.o.visited = true;
        });
        layer--;
        row = 0;
    });
}

// TODO: handle graph width
// layering
function coffmanGrahamLayering(tNodes) {
    var layer = 10,
        succ = [],
        rtNodes = [];

    tNodes.forEach(function (d) {
        rtNodes.push(copyNode(d));
    });

    rtNodes.reverse().forEach(function (n) {
        // get outgoing neighbor
        succ = tarLinkHash[nodeHash[n.uuid]];
        if (typeof succ === "undefined") {
            nodes[n.id].col = layer;
            n.col = 10;
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
}


// TODO: lexicographic sort for each layer
// topology sort (inspired by http://en.wikipedia.org/wiki/Topological_sorting)
function topSort(inputs) {
    var s = [],
        l = [],
        cnodes = [],
        n = null,
        succ = [];

    // deep copy arrays by value
    inputs.forEach(function (inNode) {
        s.push(copyNode(inNode));
    });
    nodes.forEach(function (selNode) {
        cnodes.push(copyNode(selNode));
    });

    // to avoid definition of function in while loop below (added by NG)
    var handleUndefined = function (m) {
        // delete parent with p.uuid == n.uuid
        var index = -1;
        cnodes[m].parents.forEach(function (p, i) {
            if (p == n.uuid) {
                index = i;
            }
        });
        if (index > -1) {
            cnodes[m].parents.splice(index, 1);
        }
        if (cnodes[m].parents.length === 0) {
            s.push(cnodes[m]);
        }
    };

    while (s.length > 0) {
        n = s.shift();
        l.push(n);

        // n (src) -> m (tar)
        succ = tarLinkHash[nodeHash[n.uuid]];

        if (typeof succ !== "undefined") {
            succ.forEach(handleUndefined);
        }
    }

    return l;
}

// main d3 visualization function
function visualize() {

    // short delay
    setTimeout(function () {

        // set coordinates for nodes
        nodes.forEach(function (d) {
            d.x = d.col * 50 + 100;
            d.y = d.row * 50 + 100;
        });

        // start force layout
        force
            .nodes(nodes)
            .links(links)
            .start();

        // draw links
        link = canvas.selectAll(".link")
            .data(links)
            .enter().append("line")
            .classed({
                "link": true
            })
            .style("opacity", 0.0);

        // draw nodes
        node = canvas.selectAll(".node")
            .data(nodes)
            .enter().append("g").each(function (d) {
                if (d.nodeType === "raw" || d.nodeType === "processed") {
                    d3.select(this).append("circle").attr("r", r);
                } else {
                    d3.select(this).append("rect").attr("width", r * 2)
                        .attr("height", r * 2);
                }
            }).classed({
                "node": true,
                "rawNode": (function (d) {
                    return d.nodeType == "raw";
                }),
                "specialNode": (function (d) {
                    return d.nodeType == "special";
                }),
                "processedNode": (function (d) {
                    return d.nodeType == "processed";
                })
            });

        node.each(function () {
            d3.select(this).style("opacity", 0.0)
                .call(drag);
        });

        // add tooltip
        node.append("title")
            .text(function (d) {
                return d.index;
            });

        // update function for node dragging
        force.on("tick", update);

        // fade in
        d3.selectAll(".link").transition().duration(500).style("opacity", 0.7);
        d3.selectAll(".node").transition().duration(500).style("opacity", 1.0);
    }, 500);
}

// layout graph
function layout() {
    // toplogical order
    var topNodes = topSort(inputNodes);

    // coffman-graham layering
    coffmanGrahamLayering(topNodes);

    // group nodes by layer
    var layeredTopNodes = groupNodesByCol(topNodes);

    // place vertices
    placeNodes(layeredTopNodes);
}

// refinery injection for the provenance visualization
function runProvenanceVisualization(studyUuid) {
    var url = "/api/v1/node?study__uuid=" + studyUuid + "&format=json&limit=0";

    // parse json
    d3.json(url, function (error, data) {

        // extract raw objects
        var obj = d3.entries(data)[1];

        // extract nodes
        d3.values(obj.value).forEach(function (x, i) {
            var nodeType = "";

            // assign node types
            if (x.parents.length === 0) {
                nodeType = "raw";
            } else {
                switch (x.type) {
                    case "Source Name":
                    case "Sample Name":
                    case "Assay Name":
                        nodeType = "special";
                        break;
                    default:
                        nodeType = "processed";
                        break;
                }
            }

            // node data structure
            nodes.push({
                name: x.name,
                nodeType: nodeType,
                uuid: x.uuid,
                study: (x.study !== null) ? x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
                assay: (x.assay !== null) ? x.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
                parents: x.parents.map(function (y) {
                    return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
                }),
                fixed: true,
                row: -1,
                col: -1,
                id: i,
                visited: false
            });

            // build hashes
            nodeHash[x.uuid] = i;
            studyHash[i] = x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "");
            if (x.assay !== null)
                studyAssayHash[x.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "")] = x.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "");
            if (nodeType == "raw") {
                inputNodes.push(nodes[i]);
            }
        });

        // extract links
        nodes.forEach(function (x, i) { // x may be parent of y
            if (typeof x.uuid !== "undefined" && typeof x.parents !== "undefined") {
                var sourceIds = [];

                // for each parent entry
                x.parents.forEach(function (z, k) {
                    links.push({
                        source: nodeHash[x.parents[k]],
                        target: nodeHash[x.uuid]
                    });

                    // there might be multiple source ids
                    sourceIds.push(nodeHash[z]);
                    if (tarLinkHash.hasOwnProperty(nodeHash[z])) {
                        tarLinkHash[nodeHash[z]] = tarLinkHash[nodeHash[z]].concat([i]);
                    } else {
                        tarLinkHash[nodeHash[z]] = [i];
                    }
                });
                srcLinkHash[i] = sourceIds;
            }
        });

        // calculate layout
        layout();

        // call d3 visualization
        visualize();
    });

}

// geometric zoom
function redraw() {
    // translation and scaling
    canvas.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    // fix for rectangle getting translated too, doesn't work after window resize
    rect.attr("transform", "translate(" + (-d3.event.translate[0] / d3.event.scale) + "," + (-d3.event.translate[1] / d3.event.scale) + ")" + " scale(" + (+1 / d3.event.scale) + ")");
}

// update function for node dragging
function update() {
    // links
    link.attr("x1", function (d) {
        return d.source.x;
    })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });

    // nodes
    node.attr("transform", function (d) {
        switch (d.nodeType) {
            case "raw":
            case "processed":
                return "translate(" + d.x + "," + d.y + ")";
            case "special":
                return "translate(" + (d.x - r) + "," + (d.y - r) + ")";
        }
    });
}

// drag start listener support for nodes in force layout
function dragstart() {
    d3.event.sourceEvent.stopPropagation();
}

// drag end listener
function dragend() {
}