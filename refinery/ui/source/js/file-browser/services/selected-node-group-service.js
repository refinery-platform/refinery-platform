'use strict';

function selectedNodeGroupService (_) {
  var vm = this;
  vm.selectedNodeGroup = {};

  /**
   * Deep copy of selectedNodeGroup
   * @param {obj} group - node group object
   */
  vm.setSelectedNodeGroup = function (group) {
    // angular copy throws error if objects are identical
    if (!_.isEqual(group, vm.selectedNodeGroup)) {
      angular.copy(group, vm.selectedNodeGroup);
    }
  };
}

angular.module('refineryFileBrowser')
  .service('selectedNodeGroupService', [
    '_',
    selectedNodeGroupService
  ]
);
