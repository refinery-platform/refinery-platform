function DashboardTreemapPreloader ($q, neo4jToD3) {
  var deferred = $q.defer();

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
  .factory('dashboardTreemapPreloader', [
    '$q',
    'neo4jToD3',
    DashboardTreemapPreloader
  ]);
