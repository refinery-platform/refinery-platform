function DashboardVisData ($q, neo4jToGraph, dataSet) {
  var graph = $q.defer(),
      annotations = $q.defer();

  function Data () {}

  Data.prototype.load = function () {
    neo4jToGraph.get()
      .then(function (data) {
        graph.resolve(data);
      })
      .catch(function (e) {
        graph.reject(e);
      });

    dataSet.loadAnnotations()
      .then(function (data) {
        annotations.resolve(data);
      })
      .catch(function (e) {
        annotations.reject(e);
      });
  };

  Data.prototype.updateAnnotations = function () {
    this.data.then(function (data) {

    });
  };

  Object.defineProperty(
    Data.prototype,
    'data',
    {
      get: function() {
        return $q.all([graph.promise, annotations.promise]).then(
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
    DashboardVisData
  ]);
