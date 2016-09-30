'use strict';

function AddGroupCtrl (
  $scope,
  bootbox,
  $uibModalInstance,
  groupExtendedService,
  groupDataService) {
  // Group name modal

  var vm = this;
  vm.ok = function () {
    groupExtendedService.create({
      name: $scope.groupName
    })
      .$promise
      .then(function () {
        groupDataService.update();
        $uibModalInstance.dismiss();
      })
      .catch(function () {
        bootbox.alert(
          'This name probably already exists - try a different name.'
        );
      });
  };

  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  vm.close = function () {
    vm.$uibModalInstance.dismiss();
  };
}

angular
  .module('refineryCollaboration')
  .controller('AddGroupCtrl', [
    '$scope',
    'bootbox',
    '$uibModalInstance',
    'groupExtendedService',
    'groupDataService',
    AddGroupCtrl
  ]);
