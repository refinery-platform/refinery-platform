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
  // After invite is sent, an alert pops up with following message
  var generateAlertMessage = function (infoType, groupName) {
    console.log('in generate alert message');
    console.log(infoType);
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
    vm.dataLoading = true;
    var name = vm.nodeGroupName;
    if (vm.nodeGroupName && isUniqueName(name)) {
      var params = selectedNodesService.getNodeGroupParams();
      params.name = name;
      var assayUuid = $window.externalAssayUuid;
      fileBrowserFactory.createNodeGroup(params).then(function () {
        // update node group list
        fileBrowserFactory.getNodeGroupList(assayUuid).then(function () {
          // Find index of of new name in the node group list
          var newNameIndex = _.findLastIndex(
            fileBrowserFactory.nodeGroupList,
            { name: name }
          );

          if (newNameIndex > -1) {
            // Set the selected node group as the latest
            selectedNodeGroupService.setSelectedNodeGroup(
              fileBrowserFactory.nodeGroupList[newNameIndex]
            );
            // update selected node group uuid
            selectedNodesService.selectedNodeGroupUuid = selectedNodeGroupService
            .selectedNodeGroup.uuid;
          }
        });
        vm.dataLoading = false;
        generateAlertMessage('success', name);
        // Pause to display creation success.
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        vm.dataLoading = false;
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

