'use strict';

var ConfirmationDialogInstanceCtrl = function (
  $scope, $uibModalInstance, config
) {
  this.config = config;

  this.ok = function () {
    $uibModalInstance.close();
  };
};

angular
  .module('refineryMetadataTableImport')
  .controller('ConfirmationDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', ConfirmationDialogInstanceCtrl
  ]);
