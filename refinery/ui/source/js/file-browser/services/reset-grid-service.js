(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .service('resetGridService', resetGridService);

  function resetGridService () {
    var vm = this;
    vm.resetGridFlag = false;
    // param keeps current filter params
    vm.refreshGridFlag = false;
    vm.setRefreshGridFlag = setRefreshGridFlag;
    vm.setResetGridFlag = setResetGridFlag;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function setRefreshGridFlag (state) {
      vm.refreshGridFlag = state;
    }

    function setResetGridFlag (state) {
      vm.resetGridFlag = state;
    }
  }
})();
