angular
  .module('refineryDashboard')
  .factory('dashboardDataSetSourceService', ['$q',
    function ($q) {
      return {
        /**
         * Interface for the getter
         * @param  {number}   offset  First item returned by the API.
         * @param  {number}   limit   Number of items returned by the API.
         * @return {object}           Angular promise.
         */
        get: function (limit, offset) {
          return $q.defer().promise;
        },
        /**
         * Switch getter with a custom function.
         * @param {function} sourceFunction The actualy source function, e.g.
         *
         */
        setSource: function (sourceFunction) {
          this.get = sourceFunction;
        }
      };
    }
  ]);
