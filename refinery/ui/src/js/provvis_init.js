/**
 * Module for init.
 */
var provvisInit = function () {

    /* Initialize node-link arrays. */
    var nodes = [],
        links = [],
        iNodes = [],
        oNodes = [],
        aNodes = [],
        saNodes = [],

        nodeMap = d3.map(),

        nodePredMap = [],
        nodeSuccMap = [],
        nodeLinkPredMap = [],
        nodeLinkSuccMap = [],

        analysisWorkflowMap = d3.map();

    /**
     * Assign node types.
     * @param fileType Dataset specified node type.
     * @returns {string} The CSS class corresponding to the type of the node.
     */
    var assignNodeType = function (fileType) {
        var nodeType = "";

        switch (fileType) {
            case "Source Name":
            case "Sample Name":
            case "Assay Name":
                nodeType = "special";
                break;
            case "Data Transformation Name":
                nodeType = "dt";
                break;
            default:
                nodeType = "processed";
                break;
        }

        return nodeType;
    };

    /**
     * Extract node api properties.
     * @param n Node object.
     * @param type Dataset specified node type.
     * @param id Integer identifier for the node.
     */
    var extractNodeProperties = function (n, type, id) {
        /*var study = (n.study !== null) ? n.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
         assay = (n.assay !== null) ? n.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
         parents = n.parents.map(function (y) {
         return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
         }),
         analysis = (n.analysis_uuid !== null) ? n.analysis_uuid : "dataset",
         rowBK = {left: -1, right: -1};

         nodes.push(new provvisDecl.Node(id, type, -1, false, [], [], Object.create(null), [], -1, -1, -1, -1, n.name, n.type, n.uuid, study, assay, parents, analysis, n.subanalysis, rowBK, -1, false));*/


        nodes.push({
            name: n.name,
            fileType: n.type,
            nodeType: type,
            uuid: n.uuid,
            study: (n.study !== null) ? n.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
            assay: (n.assay !== null) ? n.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
            parents: n.parents.map(function (y) {
                return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
            }),
            row: -1,
            rowBK: {left: -1, right: -1},
            col: -1,
            id: id,
            analysis: (n.analysis_uuid !== null) ? n.analysis_uuid : "dataset",
            doi: -1,
            hidden: false,
            bcOrder: -1,
            isBlockRoot: false,
            x: 0,
            y: 0,
            subanalysis: n.subanalysis,
            parent: {}
        });
    };

    /**
     * Extract nodes.
     * @param datasetJsonObj Analysis dataset of type JSON.
     */
    var extractNodes = function (datasetJsonObj) {
        d3.values(datasetJsonObj.value).forEach(function (n, i) {

            /* Assign class string for node types. */
            var nodeType = assignNodeType(n.type);

            /* Extract node properties from api. */
            extractNodeProperties(n, nodeType, i);

            /* Build node hashes. */
            nodeMap.set(n.uuid, nodes[i]);

            /* Sorted set of input nodes. */
            if (n.type === "Source Name") {
                iNodes.push(nodes[i]);
            }
        });
    };

    /**
     * Extract link properties.
     * @param n Node object.
     * @param lId Integer identifier for the link.
     * @param puuid The serialized unique identifier for the parent node.
     */
    var extractLinkProperties = function (n, lId, puuid) {
        links.push({
            source: nodeMap.get(puuid),
            target: n,
            id: lId,
            hidden: false,
            neighbor: false,
            type0: false,
            type1: false
        });
    };

    /**
     * Build link hashes.
     * @param puuid The serialized unique identifier for the parent node.
     * @param lId Integer identifier for the link.
     * @param nId Integer identifier for the node.
     * @param srcNodeIds Integer array containing all node identifiers preceding the current node.
     * @param srcLinkIds Integer array containing all link identifiers preceding the current node.
     */
    var createLinkHashes = function (puuid, lId, nId, srcNodeIds, srcLinkIds) {
        var pnId = nodeMap.get(puuid).id;

        srcNodeIds.push(pnId);
        srcLinkIds.push(lId);

        if (nodeSuccMap.hasOwnProperty(pnId)) {
            nodeSuccMap[pnId] = nodeSuccMap[pnId].concat([nId]);
            nodeLinkSuccMap[pnId] = nodeLinkSuccMap[pnId].concat([lId]);
        } else {
            nodeSuccMap[pnId] = [nId];
            nodeLinkSuccMap[pnId] = [lId];
        }
    };

    /**
     * Extract links.
     */
    var extractLinks = function () {
        var lId = 0;

        nodes.forEach(function (n, i) {
            if (typeof n.uuid !== "undefined") {
                if (typeof n.parents !== "undefined") {
                    var srcNodeIds = [],
                        srcLinkIds = [];

                    /* For each parent entry. */
                    n.parents.forEach(function (puuid, j) { /* p is the parent uuid of n. */
                        if (typeof nodeMap.get(puuid) !== "undefined") {
                            /* ExtractLinkProperties. */
                            extractLinkProperties(n, lId, puuid);

                            /* Build link hashes. */
                            createLinkHashes(puuid, lId, i, srcNodeIds, srcLinkIds);
                            lId++;
                        } else {
                            console.log("ERROR: Dataset might be corrupt - parent: " + puuid + " of node with uuid: " + n.uuid + " does not exist.");
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
     * Divide analyses into independent subanalyses.
     */
    var markSubanalyses = function () {
        var subanalysis = 0;

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

        /* For each subanalysis in the dataset. */
        iNodes.forEach(function (n) {
            if (n.subanalysis === null) {

                traverseDataset(n, subanalysis);
                subanalysis++;
            }
        });
    };

    /**
     * Set output nodes - nodes not having any successor nodes.
     */
    var setOutputNodes = function () {
        nodes.forEach(function (n) {
            if (typeof nodeSuccMap[n.id] === "undefined") {
                oNodes.push(n);

                /* Set successor maps for output nodes to an empty array. */
                nodeSuccMap[n.id] = [];
                nodeLinkSuccMap[n.id] = [];
            }
        });
    };

    /**
     * Extracts analyses nodes as well as maps it to their corresponding workflows.
     *
     * @param analysesData analyses object extracted from global refinery variable.
     */
    var extractAnalyses = function (analysesData) {
        aNodes.push({"uuid": "dataset", "row": -1, "col": -1, "hidden": true, "id": -1, "nodeType": "analysis", "start": -1, "end": -1, "created": -1, "doi": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": [], "links": []});
        analysesData.filter(function (a) {
            return a.status === "SUCCESS";
        }).forEach(function (a, i) {

            /* New node. */
            aNodes.push({"uuid": a.uuid, "row": -1, "col": -1, "hidden": true, "id": -i - 2, "nodeType": "analysis", "start": a.time_start, "end": a.time_end, "created": a.creation_date, "doi": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": [], "links": []});

            /* Analysis -> workflow. */
            analysisWorkflowMap.set(a.uuid, a.workflow__uuid);
        });
    };

    /**
     * For each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it.
     */
    var createAnalysisNodeMapping = function () {

        /* Sub-analysis. */

        /* Create sub-analysis node. */
        var sanId = -1 * aNodes.length - 1;
        aNodes.forEach(function (an) {
            nodes.filter(function (n) {
                return n.analysis === an.uuid;
            }).forEach(function (n) {
                if (!an.children.hasOwnProperty(n.subanalysis)) {
                    var san = {"id": sanId, "subanalysis": n.subanalysis, "nodeType": "subanalysis", "row": -1, "col": -1, "hidden": true, "doi": -1, "children": [], "inputs": [], "outputs": [], "preds": [], "succs": [], "parent": an, "isOutputAnalysis": false};
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
                return l !== null && san.parent.uuid === l.target.analysis && l.target.subanalysis === san.subanalysis;
            });
        });

        /* Add subanalysis to nodes collection. */
        saNodes.forEach(function (san) {
            nodes[san.id] = san;
        });

        /* Analysis. */
        aNodes.forEach(function (an) {

            /* Children are set already. */

            /* Set input nodes. */
            an.children.forEach(function (san) {
                an.inputs = an.inputs.concat(san.inputs);
            });

            /* Set output nodes. */
            an.children.forEach(function (san) {
                an.outputs = an.outputs.concat(san.outputs);
            });
        });

        aNodes.forEach(function (an) {

            /* Set predecessor analyses. */
            an.children.forEach(function (san) {
                san.preds.forEach(function (psan) {
                    if (an.preds.indexOf(psan.parent) === -1) {
                        an.preds = an.preds.concat(psan.parent);
                    }
                });
            });

            /* Set successor analyses. */
            an.children.forEach(function (san) {
                san.succs.forEach(function (ssan) {
                    if (an.succs.indexOf(ssan.parent) === -1) {
                        an.succs = an.succs.concat(ssan.parent);
                    }
                });
            });
        });

        /* Set links. */
        aNodes.forEach(function (an) {
            an.children.forEach(function (san) {
                an.links = an.links.concat(san.links);
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
            an.outputs.forEach(function (aon) {
                nodeSuccMap[an.id] = nodeSuccMap[an.id].concat(nodeSuccMap[aon.id]);
                nodeLinkSuccMap[an.id] = nodeLinkSuccMap[an.id].concat(nodeLinkSuccMap[aon.id]);
            });
        });
    };

    /* Main init function. */
    var runInitPrivate = function (data) {
        /* Extract raw objects. */
        var obj = d3.entries(data)[1];

        /* Create node collection. */
        extractNodes(obj);

        /* Create link collection. */
        extractLinks();

        /* Create analysis nodes. */
        extractAnalyses(analyses.objects);

        /* Divide dataset and analyses into sub-analyses. */
        markSubanalyses();

        /* Set output nodes. */
        setOutputNodes();

        /* Create analysis node mapping. */
        createAnalysisNodeMapping();

        /* Create graph. */
        return new provvisDecl.ProvGraph(nodes, links, iNodes, oNodes, aNodes, saNodes, nodePredMap, nodeSuccMap, nodeLinkPredMap, nodeLinkSuccMap, analysisWorkflowMap, 0, 0, []);
    };

    /**
     * Publish module function.
     */
    return{
        runInit: function (data) {
            return runInitPrivate(data);
        }
    };
}();