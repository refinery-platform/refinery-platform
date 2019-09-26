'use strict';

var ConfirmationDialogInstanceCtrl = function (
  $scope, $uibModalInstance, config, settings
) {
  var vm = this;
  vm.config = config;
  vm.instanceName = settings.djangoApp.refineryInstanceName;

  vm.ok = function () {
    $uibModalInstance.close();
  };
};

angular
  .module('refineryDataSetImport')
  .controller('ConfirmationDialogInstanceCtrl', [
    '$scope', '$uibModalInstance', 'config', 'settings', ConfirmationDialogInstanceCtrl
  ]);
