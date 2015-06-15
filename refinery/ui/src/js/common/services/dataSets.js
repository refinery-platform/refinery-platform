angular
  .module('refineryApp')
  .factory('dataSetsService', ['$q', '$http', 'settings', 'errors',
    function ($q, $http, settings, errors) {
      function get () {
        var deferred = $q.defer();

        $http({
          method: 'GET',
          url: settings.refineryApi + '/data_sets',
          params: {
            format: 'json'
          }
        }).success(function (data) {
            deferred.resolve(data);
          })
          .error(function (error) {
            deferred.reject(error);
          });

        return deferred.promise;
      }

      function search (q) {
        var deferred = $q.defer();

        $http
          .get(settings.refineryApi + 'versions')
          .success(function (data) {
            deferred.resolve(data);
          })
          .error(function (error) {
            deferred.reject(error);
          });

        return deferred.promise;
      }

      return {
        get: get,
      };
    }
  ]);
