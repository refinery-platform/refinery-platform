'use strict';

function watchNodeSelection () {
  var vm = this;
  vm.nodeSelection = [];

  vm.setNodeSelection = function (nodeSelectArray) {
    console.log('in service');
    vm.nodeSelection = nodeSelectArray;
    console.log(vm.nodeSelection);
  };
}

angular.module('refineryFileBrowser')
  .service('watchNodeSelection', [
    watchNodeSelection
  ]
);
