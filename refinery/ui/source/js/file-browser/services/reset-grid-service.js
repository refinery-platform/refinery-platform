'use strict';

function resetGridService () {
  var vm = this;
  vm.resetGridFlag = false;
  // param keeps current filter params
  vm.refreshGridFlag = false;

  vm.setResetGridFlag = function (state) {
    vm.resetGridFlag = state;
  };

  vm.setRefreshGridFlag = function (state) {
    vm.refreshGridFlag = state;
  };
}

angular.module('refineryFileBrowser')
  .service('resetGridService', [
    resetGridService
  ]
);
