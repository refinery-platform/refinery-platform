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
     * @returns {provvisDecl.Node} New Node object.
     */
    var createNode = function (n, type, id) {
        var study = (n.study !== null) ? n.study.replace(/\/api\/v1\/study\//g, "").replace(/\//g, "") : "",
            assay = (n.assay !== null) ? n.assay.replace(/\/api\/v1\/assay\//g, "").replace(/\//g, "") : "",
            parents = n.parents.map(function (y) {
                return y.replace(/\/api\/v1\/node\//g, "").replace(/\//g, "");
            }),
            analysis = (n.analysis_uuid !== null) ? n.analysis_uuid : "dataset",
            rowBK = {left: -1, right: -1};

        return new provvisDecl.Node(id, type, Object.create(null), -1, false, n.name, n.type, study, assay, parents, analysis, n.subanalysis, n.uuid, rowBK, -1, false);
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
            nodes.push(createNode(n, nodeType, i));

            /* Build node hashes. */
            nodeMap.set(n.uuid, nodes[i]);
        });
    };

    /**
     * Extract link properties.
     * @param lId Integer identifier for the link.
     * @param source Source node object.
     * @param target Target node object.
     * @returns {provvisDecl.Link} New Link object.
     */
    var createLink = function (lId, source, target) {
        return new provvisDecl.Link(lId, source, target, false);
    };

    /**
     * Extract links.
     */
    var extractLinks = function () {
        var lId = 0;

        nodes.forEach(function (n, i) {
            if (typeof n.uuid !== "undefined") {
                if (typeof n.parents !== "undefined") {

                    /* For each parent entry. */
                    n.parents.forEach(function (puuid) { /* n -> target; p -> source */
                        if (typeof nodeMap.get(puuid) !== "undefined") {
                            /* ExtractLinkProperties. */
                            links.push(createLink(lId, nodeMap.get(puuid), n));
                            lId++;
                        } else {
                            console.log("ERROR: Dataset might be corrupt - parent: " + puuid + " of node with uuid: " + n.uuid + " does not exist.");
                        }
                    });
                } else {
                    console.log("Error: Parents array of node with uuid: " + n.uuid + " is undefined!");
                }
            } else {
                console.log("Error: Node uuid is undefined!");
            }
        });
    };

    /**
     * For each node, set pred nodes, succ nodes, predLinks links as well as succLinks links.
     */
    var createNodeLinkMapping = function () {
        links.forEach(function (l) {
            l.source.succs.set(l.target.autoId, l.target);
            l.source.succLinks.set(l.autoId, l);
            l.target.preds.set(l.source.autoId, l.source);
            l.target.predLinks.set(l.autoId, l);
        });

        /* Set input and output nodes. */
        nodes.forEach(function (n) {
            if (n.succs.empty()) {

                /* Set output nodes. */
                oNodes.push(n);
            } else if (n.preds.empty()) {

                /* Set input nodes. */
                iNodes.push(n);
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
            n.preds.values().forEach(function (pn) {
                if (pn.subanalysis === null) {
                    traverseBackSubanalysis(pn, subanalysis);
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

            if (n.preds.size() > 1) {
                n.preds.values().forEach(function (pn) {
                    if (pn.subanalysis === null) {
                        traverseBackSubanalysis(pn, subanalysis);
                    }
                });
            }

            n.succs.values().forEach(function (sn) {
                if (sn.analysis !== "dataset") {
                    if (sn.subanalysis === null) {
                        if (!sn.succs.empty()) {
                            subanalysis = sn.succs.values()[0].subanalysis;
                        }
                    } else {
                        subanalysis = sn.subanalysis;
                    }
                }
                traverseDataset(sn, subanalysis);
            });
        };

        /* For each subanalysis in the dataset. */
        iNodes.forEach(function (n) {
            /* Processed nodes are set to "null" after parsing nodes. */
            if (n.subanalysis === null) {

                traverseDataset(n, subanalysis);
                subanalysis++;
            }
        });
    };

    /**
     * Create analysis node.
     * @param a Analysis.
     * @param i Index.
     * @returns {provvisDecl.Analysis} New Analysis object.
     */
    var createAnalysisNode = function (a, i) {
        if (i === -1) {
            return new provvisDecl.Analysis(-i - 2, "analysis", Object.create(null), -1, true, "dataset", "noworkflow",
                0, -1, -1, -1, d3.map(), d3.map(), d3.map());
        } else {
            return new provvisDecl.Analysis(-i - 2, "analysis", Object.create(null), -1, true, a.uuid,
                a.workflow__uuid, i + 1, a.time_start, a.time_end, a.creation_date, d3.map(), d3.map(), d3.map());
        }
    };

    /**
     * Extracts analyses nodes as well as maps it to their corresponding workflows.
     * @param analysesData analyses object extracted from global refinery variable.
     */
    var extractAnalyses = function (analysesData) {

        /* Create analysis for dataset. */
        aNodes.push(createAnalysisNode(null, -1));
        analysisWorkflowMap.set("dataset", "noworkflow");

        /* Create remaining analyses. */
        analysesData.forEach(function (a, i) {

            aNodes.push(createAnalysisNode(a, i));
            analysisWorkflowMap.set(a.uuid, a.workflow__uuid);
        });
    };

    /**
     * Create subanalysis node.
     * @param sanId Subanalysis id.
     * @param an Analysis.
     * @param i Index.
     * @param subanalysis
     * @returns {provvisDecl.Subanalysis} New Subanalysis object.
     */
    var createSubanalysisNode = function (sanId, an, i, subanalysis) {
        return new provvisDecl.Subanalysis(sanId, "subanalysis", an, -1, true, i, subanalysis, d3.map(), d3.map(), false);
    };

    /**
     * For each analysis the corresponding nodes as well as specifically in- and output nodes are mapped to it.
     */
    var createAnalysisNodeMapping = function () {

        /* subanalysis. */

        /* Create subanalysis node. */
        var sanId = -1 * aNodes.length - 1;
        aNodes.forEach(function (an) {
            nodes.filter(function (n) {
                return n.analysis === an.uuid;
            }).forEach(function (n) {
                if (!an.children.has(n.subanalysis)) {
                    var i = 0;
                    var san = createSubanalysisNode(sanId, an, i, n.subanalysis);
                    saNodes.push(san);
                    an.children.set(n.subanalysis, san);
                    sanId--;
                    i++;
                }
            });
        });

        saNodes.forEach(function (san) {

            /* Set child nodes for subanalysis. */
            nodes.filter(function (n) {
                return san.parent.uuid === n.analysis && n.subanalysis === san.subanalysis;
            }).forEach(function (cn) {
                san.children.set(cn.autoId, cn);
            });

            /* Set subanalysis parent for nodes. */
            san.children.values().forEach(function (n) {
                n.parent = san;
            });

            /* Set input nodes for subanalysis. */
            san.children.values().filter(function (n) {
                return n.preds.values().some(function (p) {
                    return p.analysis !== san.parent.uuid;
                }) || n.preds.empty();
                /* If no src analyses exists. */
            }).forEach(function (inn) {
                san.inputs.set(inn.autoId, inn);
            });

            /* Set output nodes for subanalysis. */
            san.children.values().filter(function (n) {
                return n.succs.empty() || n.succs.values().some(function (s) {
                    return s.analysis !== san.parent.uuid;
                });
            }).forEach(function (onn) {
                san.outputs.set(onn.autoId, onn);
            });
        });

        saNodes.forEach(function (san) {
            /* Set predecessor subanalyses. */
            san.inputs.values().forEach(function (n) {
                n.preds.values().forEach(function (pn) {
                    if (!san.preds.has(pn.parent.autoId)) {
                        san.preds.set(pn.parent.autoId, pn.parent);
                    }
                });
            });

            /* Set successor subanalyses. */
            san.outputs.values().forEach(function (n) {
                n.succs.values().forEach(function (sn) {
                    if (!san.succs.has(sn.parent.autoId)) {
                        san.succs.set(sn.parent.autoId, sn.parent);
                    }
                });
            });
        });

        /* Set link references for subanalyses. */
        saNodes.forEach(function (san) {
            san.inputs.values().forEach(function (sain) {
                sain.predLinks.values().forEach(function (l) {
                    san.predLinks.set(l.autoId, l);
                });
            });

            san.outputs.values().forEach(function (saon) {
                saon.succLinks.values().forEach(function (l) {
                    san.succLinks.set(l.autoId, l);
                });
            });
        });

        /* Set links for subanalysis. */
        saNodes.forEach(function (san) {
            links.filter(function (l) {
                return l !== null && san.parent.uuid === l.target.analysis && l.target.subanalysis === san.subanalysis;
            }).forEach(function (ll) {
                san.links.set(ll.autoId, ll);
            });
        });

        /* Add subanalysis to nodes collection. */
        saNodes.forEach(function (san) {
            nodes[san.id] = san;
        });

        /* Analysis. */
        aNodes.forEach(function (an) {

            /* Children are set already. */
            an.children.values().forEach(function (san) {
                /* Set input nodes. */
                san.inputs.entries().forEach(function (sani) {
                    an.inputs.set(sani.key, sani.value);
                });

                /* Set output nodes. */
                san.outputs.entries().forEach(function (sano) {
                    an.outputs.set(sano.key, sano.value);
                });
            });
        });

        aNodes.forEach(function (an) {

            /* Set predecessor analyses. */
            an.children.values().forEach(function (san) {
                san.preds.values().forEach(function (psan) {
                    if (!an.preds.has(psan.parent.autoId)) {
                        an.preds.set(psan.parent.autoId, psan.parent);
                    }
                });
            });

            /* Set successor analyses. */
            an.children.values().forEach(function (san) {
                san.succs.values().forEach(function (ssan) {
                    if (!an.succs.has(ssan.parent.autoId)) {
                        an.succs.set(ssan.parent.autoId, ssan.parent);
                    }
                });
            });
        });

        /* Set links. */
        aNodes.forEach(function (an) {
            an.children.values().forEach(function (san) {
                san.links.values().forEach(function (sanl) {
                    an.links.set(sanl.autoId, sanl);
                });
            });
        });

        /* Add to nodes. */
        aNodes.forEach(function (an, i) {
            nodes[-i - 1] = aNodes[i];
        });

        /* Set predLinks and succLinks. */
        aNodes.forEach(function (an) {
            an.inputs.values().forEach(function (ain) {
                ain.predLinks.values().forEach(function (l) {
                    an.predLinks.set(l.autoId, l);
                });
            });
            an.outputs.values().forEach(function (aon) {
                aon.succLinks.values().forEach(function (l) {
                    an.succLinks.set(l.autoId, l);
                });
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

        /* Set preds, succs, and predLinks as well as succLinks. */
        createNodeLinkMapping();

        /* Create analysis nodes. */
        extractAnalyses(analyses.objects.filter(function (a) {
            return a.status === "SUCCESS";
        }));

        /* Divide dataset and analyses into subanalyses. */
        markSubanalyses();

        /* Create analysis node mapping. */
        createAnalysisNodeMapping();

        /* Create graph. */
        return new provvisDecl.ProvGraph(nodes, links, iNodes, oNodes, aNodes, saNodes, analysisWorkflowMap, 0, 0, []);
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