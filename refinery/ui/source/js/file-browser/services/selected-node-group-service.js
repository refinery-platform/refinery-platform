'use strict';

function selectedNodeGroupService () {
  var vm = this;
  vm.selectedNodeGroup = {};

  /**
   * Deep copy of selectedNodeGroup
   * @param {obj} group - node group object
   */
  vm.setSelectedNodeGroup = function (group) {
    angular.copy(vm.selectedNodeGroup, group);
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodeGroupService', [
    selectedNodeGroupService
  ]
);
