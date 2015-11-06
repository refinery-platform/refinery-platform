angular
  .module('refineryDashboard')
  .factory('dashboardDataSetListService', ['dataSetService', '_',
    function (dataSetService, _) {
      return function (limit, offset, extra) {
        return dataSetService.query(_.merge(_.cloneDeep(extra) || {}, {
            limit: limit,
            offset: offset
          })).$promise;
      };
    }
  ]);
