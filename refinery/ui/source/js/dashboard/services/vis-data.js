function DashboardVisData ($q, neo4jToGraph, dataSet, graph) {
  var neo4JGraph = $q.defer(),
      annotations = $q.defer();

  function Data () {}

  Data.prototype.load = function () {
    neo4jToGraph.get()
      .then(function (data) {
        neo4JGraph.resolve(data);
      })
      .catch(function (e) {
        neo4JGraph.reject(e);
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
    $q.all([neo4JGraph.promise, annotations]).then(function (results) {
      graph.updateAnnotations(results[0], results[1]);
    });
  };

  Object.defineProperty(
    Data.prototype,
    'data',
    {
      get: function() {
        return $q.all([neo4JGraph.promise, annotations.promise]).then(
          function (results) {
            return {
              graph: results[0],
              annotations: results[1]
            };
          }
        );
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
    DashboardVisData
  ]);
