function DataSetDataApiFactory (_, dataSetService) {
  /**
   * Class constructor for querying the dataset data API.
   *
   * @method  DataSetDataApi
   * @author  Fritz Lekschas
   * @date    2015-10-09
   * @param   {[type]}        extra  [description]
   */
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
  .module('dataSet')
  .factory('DataSetDataApi', [
    '_',
    'dataSetService',
    DataSetDataApiFactory
  ]);
