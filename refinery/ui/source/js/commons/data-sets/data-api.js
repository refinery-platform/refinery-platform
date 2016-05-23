'use strict';

function DataSetDataApiFactory ($q, _, dataSetService) {
  /**
   * Class constructor for querying the dataset data API.
   *
   * @method  DataSetDataApi
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @param   {Object}  extra  Parameters other than `limit` and `offset`.
   */
  function DataSetDataApi (extra, firstTimeAllIds, onlyIds) {
    var params = {};

    if (_.isObject(extra)) {
      params = _.cloneDeep(extra);
    }

    if (onlyIds) {
      return dataSetService.query({
        extra: 'ids'
      }).$promise;
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

      var returnData = dataSetService
        .query(params).$promise.then(function (data) {
          // Rename `meta.total_count` into `meta.total`.
          Object.defineProperty(
            data.meta,
            'total',
            Object.getOwnPropertyDescriptor(data.meta, 'total_count')
          );
          delete data.meta.total_count;

          // Rename `objects` into `data`.
          Object.defineProperty(
            data,
            'data',
            Object.getOwnPropertyDescriptor(data, 'objects')
          );
          delete data.objects;

          for (var i = data.data.length; i--;) {
            data.data[i].creationDate = new Date(data.data[i].creation_date);
            delete data.data[i].creation_date;
            data.data[i].modificationDate = new Date(data.data[i].modification_date);
            delete data.data[i].modification_date;
          }

          return data;
        });

      var allIds = $q.when(false);

      if (firstTimeAllIds) {
        allIds = dataSetService.query({
          extra: 'ids'
        }).$promise;
        firstTimeAllIds = false;  // eslint-disable-line no-param-reassign
      }

      return $q.all([returnData, allIds]).then(function (results) {
        if (results[1]) {
          results[0].allIds = results[1].ids;
        }
        return results[0];
      });
    };
  }

  return DataSetDataApi;
}

angular
  .module('dataSet')
  .factory('DataSetDataApi', [
    '$q',
    '_',
    'dataSetService',
    DataSetDataApiFactory
  ]);
