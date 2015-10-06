function DataSetDataApiFactory (_, dataSetService) {
  function DataSetDataApi () {
    return function (limit, offset, extra) {
      return dataSetService.query(_.merge(_.cloneDeep(extra) || {}, {
        limit: limit,
        offset: offset
      })).$promise;
    };
  }

  return DataSetDataApi;
}

angular
  .module('dataset')
  .factory('dataSetDataApi', [
    '_',
    'dataSetService',
    DataSetDataApiFactory
  ]);
