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
  vm.dataLoading = false;
/*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */
  // Helper Method, after invite is sent, alert pops up with following message
  var generateAlertMessage = function (infoType, groupName) {
    if (infoType === 'success') {
      vm.alertType = 'success';
      vm.responseMessage = 'Successfully created group ' + groupName;
    } else if (infoType === 'danger') {
      vm.alertType = 'danger';
      vm.responseMessage = 'Error creating group.';
    }
  };

  // Helper method checking if name does not exist in the group list
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
    // names needs to exist and be unique
    if (vm.nodeGroupName && isUniqueName(vm.nodeGroupName)) {
      vm.dataLoading = true;
      var params = selectedNodesService.getNodeGroupParams();
      params.name = vm.nodeGroupName;
      var assayUuid = $window.externalAssayUuid;
      fileBrowserFactory.createNodeGroup(params).then(function () {
        // update node group list
        fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
          // Find index of of new name in the node group list
          var newNameIndex = _.findLastIndex(
            fileBrowserFactory.nodeGroupList,
            { name: vm.nodeGroupName }
          );
           // Set the selected node group as the latest
          if (newNameIndex > -1) {
            selectedNodeGroupService.setSelectedNodeGroup(
              fileBrowserFactory.nodeGroupList[newNameIndex]
            );
            // update selected node group uuid
            selectedNodesService.selectedNodeGroupUuid = selectedNodeGroupService
            .selectedNodeGroup.uuid;
          }
        });
        vm.dataLoading = false;
        generateAlertMessage('success', vm.nodeGroupName);

        // Pause to display creation success message.
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        vm.dataLoading = false;
        generateAlertMessage('danger', vm.nodeGroupName);
        $log.error(error);
      });
      // For duplicate group names, don't make an api call.
    } else {
      vm.dataLoading = false;
      vm.alertType = 'danger';
      vm.responseMessage = 'Error, duplicate group name. Please try another' +
        ' name.';
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

