'use strict';

function IGVLaunchModalCtrl (
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
    '$uibModalInstance',
    IGVLaunchModalCtrl
  ]);
