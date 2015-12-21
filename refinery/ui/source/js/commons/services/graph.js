function GraphFactory ($q, Webworker) {

  function Graph () {}

  /**
   * Update a graph's annotations
   *
   * @method  updateAnnotations
   * @author  Fritz Lekschas
   * @date    2015-12-21
   * @static
   * @return  {Graph}  Updated graph.
   */
  Graph.updateAnnotations = function (graph, annotations) {
    // Note: Looping over the large graph uncondtionally and looping again over
    // all annotations is **faster** than one conditional loop, which is
    // potentially due to the high number of comparisions.
    var nodeKeys = Object.keys(graph), i;

    for (i = nodeKeys.length; i--;) {
      graph[nodeKeys[i]].numDataSets = 0;
    }

    nodeKeys = Object.keys(annotations);
    for (i = nodeKeys.length; i--;) {
      if (graph[nodeKeys[i]]) {
        graph[nodeKeys[i]].numDataSets = annotations[nodeKeys[i]].total;
      }
    }
  };

  return Graph;
}

angular
  .module('refineryApp')
  .service('graph', [
    '$q',
    'Webworker',
    GraphFactory
  ]);
