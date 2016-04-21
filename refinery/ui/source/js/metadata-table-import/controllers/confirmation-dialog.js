'use strict';

var ConfirmationDialogInstanceCtrl = function (
  $scope, $uibModalInstance, config
) {
  $scope.config = config;

  $scope.ok = function () {
    $uibModalInstance.close();
  };
};

angular
  .module('refineryMetadataTableImport')
  .controller('ConfirmationDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', ConfirmationDialogInstanceCtrl
  ]);
