function ConfirmationDialogInstanceCtrl ($scope, $uibModalInstance, config) {
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
  .controller('ConfirmationDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', ConfirmationDialogInstanceCtrl
  ]);
