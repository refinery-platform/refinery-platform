'use strict';

function AddGroupCtrl (
  $timeout,
  $log,
  $uibModalInstance,
  groupExtendedService,
  groupDataService) {
  // Group name modal

  var vm = this;
  vm.responseMessage = '';
  vm.alertType = 'info';
  // After invite is sent, an alert pops up with following message
  var generateAlertMessage = function (infoType, groupName) {
    if (infoType === 'success') {
      vm.alertType = 'success';
      vm.responseMessage = 'Successfully created group ' + groupName;
    } else if (infoType === 'danger') {
      vm.alertType = 'danger';
      vm.responseMessage = 'Error creating group. Check for group name' +
        ' duplication.';
    }
  };

  vm.createGroup = function () {
    groupExtendedService.create({
      name: vm.groupName
    })
      .$promise
      .then(function () {
        generateAlertMessage('success', vm.groupName);
        groupDataService.update();
        // Automatically dismisses modal
        $timeout(function () {
          $uibModalInstance.dismiss();
        }, 1500);
      }, function (error) {
        generateAlertMessage('danger', vm.groupName);
        $log.error(error);
      });
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
  .module('refineryCollaboration')
  .controller('AddGroupCtrl', [
    '$timeout',
    '$log',
    '$uibModalInstance',
    'groupExtendedService',
    'groupDataService',
    AddGroupCtrl
  ]);
