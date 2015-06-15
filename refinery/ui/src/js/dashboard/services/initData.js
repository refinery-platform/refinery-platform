angular
  .module('refineryDashboard')
  .factory('initData', ['$q', 'versionService',
    function ($q, versionService) {
      return function () {
        var versions = versionService.getVersions();

        return $q.all([versions]).then(function (results) {
            return {
              versions: results[0]
            };
          })
          .catch(function () {
            return {
              versions: null
            };
          });
      };
    }
  ]);
