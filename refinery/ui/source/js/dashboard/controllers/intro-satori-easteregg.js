'use strict';

function IntroSatoriEasterEggCtrl (
  $uibModalInstance
) {
  this.$uibModalInstance = $uibModalInstance;
}

/**
 * Cancel permission editing.
 * @type  {function}
 */
IntroSatoriEasterEggCtrl.prototype.cancel = function () {
  this.$uibModalInstance.dismiss('cancel');
};

angular
  .module('refineryDashboard')
  .controller('IntroSatoriEasterEggCtrl', [
    '$uibModalInstance',
    IntroSatoriEasterEggCtrl
  ]);
