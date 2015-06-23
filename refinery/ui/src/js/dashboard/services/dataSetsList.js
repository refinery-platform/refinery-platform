angular
  .module('refineryDashboard')
  .factory('dashboardDataSetListService', ['dataSetService',
    function (dataSetService) {
      return function (limit, offset) {
        var query = dataSetService.query({
          limit: limit,
          offset: offset
        });

        return query.$promise;
      };
    }
  ]);
