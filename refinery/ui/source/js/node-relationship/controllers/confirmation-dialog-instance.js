'use strict';

function NRConfirmationDialogInstanceCtrl ($scope, $uibModalInstance, config) {
  $scope.config = config;

  $scope.ok = function () {
    $uibModalInstance.close();
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}


angular
  .module('refineryNodeRelationship')
  .controller('NRConfirmationDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', NRConfirmationDialogInstanceCtrl
  ]);
