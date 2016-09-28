'use strict';

function IGVLaunchModalCtrl (
  $scope,
  $uibModal,
  $uibModalInstance
) {
  var vm = this;

  vm.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
}

angular
  .module('refineryIGV')
  .controller('IGVLaunchModalCtrl', [
    '$scope',
    '$uibModal',
    '$uibModalInstance',
    IGVLaunchModalCtrl
  ]);
