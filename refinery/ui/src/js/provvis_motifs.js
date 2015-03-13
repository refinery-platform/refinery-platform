/**
 * Module for motif discovery and injection.
 */
var provvisMotifs = function () {

    var motifs = d3.map();

    /**
     * Main motif discovery and injection module function.
     * @param graph The main graph object of the provenance visualization.
     * @param bclgNodes Barcentric layered and grouped nodes.
     */
    var runMotifsPrivate = function (graph) {

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

                /*console.log(n);
                console.log(n.autoId);*/

                /* When node has only one input and output and successor node has no other inputs, start motif. */
                if (n.succs.size() === 1 && n.succs.values()[0].preds.size() === 1) {
                    //console.log("#motif: "  + n.autoId);
                }

                /* Add successor nodes to queue. */
                n.succs.values().forEach( function (s) {
                    if (s instanceof provvisDecl.Node && nset.indexOf(s.parent.parent) === -1) {
                        nset.push(s.parent.parent);
                        nqueue.push(s.parent.parent);
                    }
                    else if (nset.indexOf(s) === -1) {
                        nset.push(s);
                        nqueue.push(s);
                    }
                });
            };

            var nqueue = [],
                nset = [];
                nset.push(dsn);
                nqueue.push(dsn);
                while(nqueue.length > 0) {
                    getSuccs(nqueue.shift());
                }

            //console.log(nset);
        };

        bfs(graph.dataset);
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