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

    return function (limit, offset) {
      params.limit = limit;
      params.offset = offset;

      return dataSetService.query(params).$promise.then(function (data) {
        // Rename `meta.total_count` into `meta.total`.
        Object.defineProperty(
          data.meta,
          'total',
          Object.getOwnPropertyDescriptor(data.meta, 'total_count')
        );
        delete data.meta['total_count'];

        // Rename `objects` into `data`.
        Object.defineProperty(
          data,
          'data',
          Object.getOwnPropertyDescriptor(data, 'objects')
        );
        delete data['objects'];

        return data;
      });
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
