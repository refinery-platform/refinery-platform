function DashboardTreemapData ($q, neo4jToD3, dataSet) {
  var basicData = $q.defer(),
      annotations = $q.defer();

  function updateAnnotationData (data, annotations) {

  }

  function Data () {}

  Data.prototype.load = function () {
    neo4jToD3.get()
      .then(function (data) {
        basicData.resolve(data);
      })
      .catch(function (e) {
        basicData.reject(e);
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
        return $q.all([basicData.promise, annotations.promise]);
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
    'dataSet',
    DashboardTreemapData
  ]);
