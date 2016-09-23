'use strict';

function AddGroupCtrl (
  $scope,
  bootbox,
  $uibModalInstance,
  groupExtendedService,
  groupDataService) {
  // Group name modal
  $scope.ok = function () {
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

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
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
