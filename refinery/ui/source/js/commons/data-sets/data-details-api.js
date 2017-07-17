'use strict';

function DataSetDataDetailsApiFactory ($q, _, dataSetService) {
  /**
   * Class constructor for querying the dataset data API.
   *
   * @method  DataSetDataDetailsApi
   * @author  Fritz Lekschas
   * @date    2015-10-09
   *
   * @param   {Object}  extra  Parameters other than `limit` and `offset`.
   */
  function DataSetDataDetailsApi (extra) {
    var params = {};

    if (_.isObject(extra)) {
      params = _.cloneDeep(extra);
    }

    function adjustData (data) {
      // Convert string to an actual date.
      data.creationDate = new Date(data.creation_date);
      delete data.creation_date;
      data.modificationDate = new Date(data.modification_date);
      delete data.modification_date;

      return data;
    }

    function objectifyResponse (results) {
      var obj = {};
      for (var i = results.length; i--;) {
        obj[results[i].id] = results[i];
      }
      return obj;
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
    return function (ids) {
      var promises = [];
      var arrIds = ids;

      if (arrIds.constructor !== Array) {
        arrIds = [arrIds];
      }

      for (var i = arrIds.length; i--;) {
        params.extra = arrIds[i];
        promises.push(dataSetService.query(params).$promise.then(adjustData));
      }

      return $q.all(promises).then(objectifyResponse);
    };
  }

  return DataSetDataDetailsApi;
}

angular
  .module('dataSet')
  .factory('DataSetDataDetailsApi', [
    '$q',
    '_',
    'dataSetService',
    DataSetDataDetailsApiFactory
  ]);
