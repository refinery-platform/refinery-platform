/**
 * Module for motif discovery and injection.
 */
var provvisMotifs = function () {

    var motifs = d3.map();

    /**
     * Breadth first search algorithm.
     * @param dsn Dataset node.
     */
    var bfs = function (dsn) {

        /**
         * Helper function to get successors of the current node;
         * @param n Node.
         */
        var getSuccs = function (n) {

            /* When node has only one input and output and successor node has no other inputs, start motif. */
            if (n.succs.size() === 1 && n.succs.values()[0].preds.size() === 1) {
                //console.log("#motif: "  + n.autoId);
            }

            /* Add successor nodes to queue. */
            n.succs.values().forEach(function (s) {
                if (s instanceof provvisDecl.Node && nset.indexOf(s.parent.parent) === -1) {
                    nset.push(s.parent.parent);
                    nqueue.push(s.parent.parent);
                } else if (nset.indexOf(s) === -1) {
                    nset.push(s);
                    nqueue.push(s);
                }
            });
        };

        var nqueue = [],
            nset = [];

        nset.push(dsn);
        nqueue.push(dsn);

        while (nqueue.length > 0) {
            getSuccs(nqueue.shift());
        }
    };


    /* TODO: In experimental development state. */

    /**
     * Find and mark sequential and parallel analysis steps.
     * @param bclgNodes Barycenter ordered, layered and grouped analysis nodes.
     * @param graph The provenance graph.
     * @returns {*} Layered nodes.
     */
    var findLayers = function (bclgNodes, graph) {

        var layers = [],
            layerNodes = d3.map(),
            layerId = 0;

        /* Iterate breath first search. */
        bclgNodes.forEach(function (l, i) {

            /**
             * Helper function to compare two d3.map() objects.
             * @param a
             * @param b
             * @returns {boolean}
             */
            var compareMaps = function (a, b) {
                var equal = true;
                if (a.size() === b.size()) {
                    a.keys().forEach(function (k) {
                        if (!b.has(k)) {
                            equal = false;
                        }
                    });
                } else {
                    equal = false;
                }
                return equal;
            };

            /* For each depth-level. */
            l.forEach(function (an) {
                var foundMotif = false,
                    thisMotif = null,
                    anPreds = d3.map(),
                    anSuccs = d3.map();

                an.predLinks.values().forEach(function (pl) {
                    anPreds.set(pl.source.autoId, pl.source);
                });
                an.succLinks.values().forEach(function (sl) {
                    anSuccs.set(sl.target.autoId, sl.target);
                });

                /* Check if the current analysis conforms to a motif already created. */
                motifs.values().forEach(function (m) {
                    if (m.wfUuid === an.wfUuid && m.numSubanalyses === an.children.size() &&
                        an.predLinks.size() === m.numIns && an.succLinks.size() === m.numOuts) {

                        /* TODO: Revise tricky condition. */
                        if (an.preds.size() === 1 && an.preds.values()[0].uuid === "dataset" &&
                            compareMaps(anPreds, m.preds)) {
                            foundMotif = true;
                            thisMotif = m;
                        } else if (an.preds.size() === 1 && an.preds.values()[0].uuid !== "dataset") {
                            foundMotif = true;
                            thisMotif = m;
                        }
                    }
                });

                /* Create new motif. */
                if (!foundMotif) {
                    var motif = new provvisDecl.Motif();
                    an.predLinks.values().forEach(function (pl) {
                        motif.preds.set(pl.source.autoId, pl.source);
                    });
                    an.succLinks.values().forEach(function (sl) {
                        motif.succs.set(sl.target.autoId, sl.target);
                    });
                    motif.numIns = an.predLinks.size();
                    motif.numOuts = an.succLinks.size();
                    motif.wfUuid = an.wfUuid;
                    motif.numSubanalyses = an.children.size();
                    motifs.set(motif.autoId, motif);
                    an.motif = motif;
                } else {
                    an.motif = thisMotif;
                }
            });

            layers.push(d3.map());


            /* Group the same motifs into the same layer. */
            l.forEach(function (an) {

                var keyStr = an.preds.values().map(function (pan) {
                        return pan.motif.autoId;
                    }),
                    layer = Object.create(null);

                if (!(layers[i].has(keyStr + "-" + an.motif.autoId))) {
                    layer = new provvisDecl.Layer(layerId, an.motif, graph, true);
                    layer.children.set(an.autoId, an);
                    an.layer = layer;
                    layerNodes.set(layer.autoId, an.layer);
                    layerId++;

                    layers[i].set(keyStr + "-" + an.motif.autoId, layer.autoId);
                } else {
                    layer = layerNodes.get(layers[i].get(keyStr + "-" + an.motif.autoId));
                    layer.children.set(an.autoId, an);
                    an.layer = layer;
                }

            });
        });
        return layerNodes;

    };

    /**
     * Main motif discovery and injection module function.
     * @param graph The main graph object of the provenance visualization.
     * @param bclgNodes Barycentric layered and grouped nodes.
     */
    var runMotifsPrivate = function (graph) {
        return findLayers(graph.bclgNodes, graph);
    };

    /**
     * Publish module function.
     */
    return{
        run: function (graph) {
            return runMotifsPrivate(graph);
        }
    };
}();