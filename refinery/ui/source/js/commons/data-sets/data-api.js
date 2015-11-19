function DataSetDataApiFactory (_, dataSetService) {
  /**
   * Class constructor for querying the dataset data API.
   *
   * @method  DataSetDataApi
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @param   {Object}  extra  Parameters other than `limit` and `offset`.
   */
  function DataSetDataApi (extra) {
    var params = {};

    if (_.isObject(extra)) {
      params = _.cloneDeep(extra);
    }

    /**
     * Actual method being exported after constructing the class.
     *
     * @method
     * @author  Fritz Lekschas
     * @date    2015-10-09
     *
     * @param   {Number}  limit   Number of data objects to be fetched.
     * @param   {Number}  offset  Starting point for retrieving data objects.
     * @return  {Object}          Promise of the actual data.
     */
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
