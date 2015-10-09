function DataSetDataApiFactory (_, dataSetService) {
  function DataSetDataApi (extra) {
    var params = _.cloneDeep(extra) || {};

    return function (limit, offset, extra) {
      params.limit = limit;
      params.offset = offset;

      return dataSetService.query(params).$promise;
    };
  }

  return DataSetDataApi;
}

angular
  .module('dataset')
  .factory('DataSetDataApi', [
    '_',
    'dataSetService',
    DataSetDataApiFactory
  ]);
