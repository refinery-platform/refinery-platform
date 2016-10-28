'use strict';

function NodeGroupModalCtrl (
  $log,
  $uibModalInstance,
  _,
  $window,
  fileBrowserFactory,
  selectedNodeGroupService,
  selectedNodesService
  ) {
  var vm = this;
  vm.nodeGroupName = '';
/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */
  var isUniqueName = function (name) {
    var flag = true;
    for (var i = 0; i < fileBrowserFactory.nodeGroupList.length; i ++) {
      if (fileBrowserFactory.nodeGroupList[i].name === name) {
        flag = false;
        break;
      }
    }
    return flag;
  };

  // Create a new node group
  vm.saveNodeGroup = function () {
    var name = vm.nodeGroupName;
    if (vm.nodeGroupName && isUniqueName(name)) {
      var params = selectedNodesService.getNodeGroupParams();
      params.name = name;
      var assayUuid = $window.externalAssayUuid;
      fileBrowserFactory.createNodeGroup(params).then(function () {
        // update node group list
        fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
          // Set the selected node group as the latest
          selectedNodeGroupService.setSelectedNodeGroup(
            _.last(fileBrowserFactory.nodeGroupList
            ));
          // update selected node group uuid
          selectedNodesService.selectedNodeGroupUuid = selectedNodeGroupService
            .selectedNodeGroup.uuid;
        });
        $uibModalInstance.dismiss();
      });
    }
  };

   // UI helper methods to cancel and close modal instance
  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  vm.close = function () {
    $uibModalInstance.dismiss();
  };
}

angular
  .module('refineryFileBrowser')
  .controller('NodeGroupModalCtrl',
  [
    '$log',
    '$uibModalInstance',
    '_',
    '$window',
    'fileBrowserFactory',
    'selectedNodeGroupService',
    'selectedNodesService',
    NodeGroupModalCtrl
  ]);

