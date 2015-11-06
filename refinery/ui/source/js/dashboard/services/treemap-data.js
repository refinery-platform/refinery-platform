function DashboardTreemapData ($q, neo4jToD3) {
  var deferred = $q.defer();

  function updateAnnotationData (data, annotations) {

  }

  function Data () {}

  Data.prototype.load = function () {
    neo4jToD3
      .get()
      .then(function (data) {
        deferred.resolve(data);
      })
      .catch(function (e) {
        deferred.reject(e);
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
        return deferred.promise;
      }
    }
  );

  return new Data();
}

angular
  .module('refineryDashboard')
  .factory('dashboardTreemapData', [
    '$q',
    'neo4jToD3',
    DashboardTreemapData
  ]);
