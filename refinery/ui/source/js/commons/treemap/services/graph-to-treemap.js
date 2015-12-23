function convertGraphToTreemap (graph) {
  var nodes = Object.keys(graph),
      node,
      uris;

  for (var i = nodes.length; i--;) {
    node = graph[nodes[i]];
    uris = node.children.slice();
    node.children = [];
    for (var j = uris.length; j--;) {
      node.children.push(graph[uris[j]]);
    }
  }

  // Deep clone object to be usable by D3's treemap layout.
  return JSON.parse(JSON.stringify(
    graph['http://www.w3.org/2002/07/owl#Thing']
  ));
}

function GraphToTreemapService ($q, Webworker) {

  function GraphToTreemap () {}

  GraphToTreemap.convert = function (graph) {
    return $q.when(graph).then(function (graph) {
      return Webworker.create(convertGraphToTreemap).run(graph);
    });
  };

  return GraphToTreemap;
}

angular
  .module('treemap')
  .service('treemapGraphToTreemap', ['$q', 'Webworker', GraphToTreemapService]);
