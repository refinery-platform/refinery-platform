angular
  .module('refineryDashboard')
  .factory('dashboardDataSetReloadService', ['$q',
    function ($q) {
      return {
        /**
         * Interface for the getter
         * @param  {number}   offset  First item returned by the API.
         * @param  {number}   limit   Number of items returned by the API.
         * @return {object}           Angular promise.
         */
        reload: function () {},
        /**
         * Switch getter with a custom function.
         * @param {function} sourceFunction The actualy source function, e.g.
         *
         */
        setReload: function (sourceFunction) {
          this.reload = sourceFunction;
        }
      };
    }
  ]);
