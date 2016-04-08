'use strict';

function InputDialogInstanceCtrl ($scope, $uibModalInstance, config) {
  $scope.config = config;
  $scope.val = {
    val: $scope.config.val
  };

  $scope.ok = function () {
    $uibModalInstance.close($scope.config.val);
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}

angular
  .module('refineryNodeRelationship')
  .controller('InputDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', InputDialogInstanceCtrl
  ]);
