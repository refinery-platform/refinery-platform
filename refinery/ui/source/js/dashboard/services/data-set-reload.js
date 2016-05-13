'use strict';

angular
  .module('refineryDashboard')
  .factory('dashboardDataSetsReloadService', [
    function () {
      return {
        /**
         * Placeholder method. Will be set by `setReload`.
         *
         * @method  reload
         * @author  Fritz Lekschas
         * @date    2016-05-09
         */
        reload: function () {},
        /**
         * Switch getter with a custom function.
         *
         * @method  setReload
         * @author  Fritz Lekschas
         * @date    2016-05-09
         *
         * @param   {Function}  sourceFunction  The function to be set as
         *   `reload`.
         */
        setReload: function (sourceFunction) {
          this.reload = sourceFunction;
        }
      };
    }
  ]);
