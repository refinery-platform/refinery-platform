'use strict';

function resetGridService () {
  var vm = this;
  vm.resetGridFlag = false;

  vm.setResetGridFlag = function (state) {
    vm.resetGridFlag = state;
  };
}

angular.module('refineryFileBrowser')
  .service('resetGridService', [
    resetGridService
  ]
);
