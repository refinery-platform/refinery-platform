function DashboardVisData ($q, neo4jToGraph, dataSet, graph, settings) {
  var graphData = $q.defer(),
      treemapData = $q.defer(),
      annotations = $q.defer();

  function Data () {}

  Data.prototype.load = function (root, valueProperty) {
    neo4jToGraph.get()
      .then(function (data) {
        // Trim graph
        var prunedData = graph.accumulateAndPrune(
          data, root ? root : settings.ontRoot, valueProperty
        );

        // Init precision and recall
        graph.initPrecisionRecall(data, dataSet.total);

        // Make precision and recall available as bars
        graph.propertyToBar(data, ['precision', 'recall']);

        // Make precision and recall available as bars
        graph.propertyToData(data, ['name']);

        // Convert graph into hierarchy for D3
        treemapData.resolve(graph.toTreemap(data, prunedData.root));

        graphData.resolve(data);
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
        return $q.all([graphData.promise, treemapData.promise]).then(
          function (results) {
            return {
              graph: results[0],
              treemap: results[1]
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
