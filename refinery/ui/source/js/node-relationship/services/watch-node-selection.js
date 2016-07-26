'use strict';

function watchNodeSelection () {
  var vm = this;
  vm.nodeSelection = [];

  vm.setNodeSelection = function (nodeSelectArray) {
    vm.nodeSelection = nodeSelectArray;
  };
}

angular.module('refineryFileBrowser')
  .service('watchNodeSelection', [
    watchNodeSelection
  ]
);
