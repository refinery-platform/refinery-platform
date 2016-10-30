'use strict';

function NodeGroupModalCtrl (
  $log,
  $timeout,
  $uibModalInstance,
  _,
  $window,
  fileBrowserFactory,
  selectedNodeGroupService,
  selectedNodesService
  ) {
  var vm = this;
  vm.nodeGroupName = '';
  vm.responseMessage = '';
  vm.alertType = 'info';
/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */
  // After invite is sent, an alert pops up with following message
  var generateAlertMessage = function (infoType, groupName) {
    if (infoType === 'success') {
      vm.alertType = 'success';
      vm.responseMessage = 'Successfully created group ' + groupName;
    } else if (infoType === 'danger') {
      vm.alertType = 'danger';
      vm.responseMessage = 'Error creating group.';
    }
  };
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
        // Pause to display creation success.
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        generateAlertMessage('error', vm.groupName);
        $log.error(error);
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
    '$timeout',
    '$uibModalInstance',
    '_',
    '$window',
    'fileBrowserFactory',
    'selectedNodeGroupService',
    'selectedNodesService',
    NodeGroupModalCtrl
  ]);

