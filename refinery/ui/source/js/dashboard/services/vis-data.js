function DashboardVisData ($q, neo4jToGraph, dataSet, graph, settings) {
  var graphData = $q.defer(),
      treemapData = $q.defer(),
      annotations = $q.defer(),
      finalRootNode = $q.defer();

  function Data () {}

  Data.prototype.load = function (root, valueProperty) {
    neo4jToGraph.get()
      .then(function (data) {
        root = root ? root : settings.ontRoot;

        // Prune graph and accumulate the dataset annotations
        var prunedData = graph.accumulateAndPrune(data, root, valueProperty);

        // Add pseudo-parent and pseudo-sibling for data sets without any
        // annotation.
        var pseudoRoot = graph.addPseudoRootAndSibling(
          data, prunedData.root, dataSet.allIds()
        );

        // Init precision and recall
        // console.log(root, graph);
        graph.initPrecisionRecall(
          data,
          valueProperty,
          dataSet.allIds().length
        );

        // Make precision and recall available as bars
        graph.propertyToBar(data, ['precision', 'recall']);

        // Make precision and recall available as bars
        graph.propertyToData(data, ['name']);

        // Convert graph into hierarchy for D3
        // treemapData.resolve(graph.toTree(data, prunedData.root));
        treemapData.resolve(graph.toTreemap(data, pseudoRoot));

        graphData.resolve(data);

        finalRootNode.resolve(pseudoRoot);
      })
      .catch(function (e) {
        graphData.reject(e);
      });

    dataSet.loadAnnotations()
      .then(function (data) {
        annotations.resolve(data);
      })
      .catch(function (e) {
        annotations.reject(e);
      });
  };

  Data.prototype.updateGraph = function (annotations) {
    $q.all([graphData.promise, annotations]).then(function (results) {
      graph.updateAnnotations(results[0], results[1]);
    });
  };

  Object.defineProperty(
    Data.prototype,
    'data',
    {
      get: function() {
        return $q.all([
            graphData.promise, treemapData.promise, finalRootNode.promise
          ]
        ).then(
          function (results) {
            return {
              graph: results[0],
              treemap: results[1],
              root: results[2]
            };
          }
        );


        // return graphData.promise.then(function (graph) {
        //   return {
        //     graph: graphData.promise
        //   };
        // });
      }
    }
  );

  return new Data();
}

angular
  .module('refineryDashboard')
  .factory('dashboardVisData', [
    '$q',
    'neo4jToGraph',
    'dataSet',
    'graph',
    'settings',
    DashboardVisData
  ]);
