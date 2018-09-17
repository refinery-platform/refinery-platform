/**
 * Data Set Transfer
 * @namespace rpDataSetTransferModal
 * @desc Transfer a data set ownership
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpDataSetTransferModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/data-set-transfer-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'DataSetTransferModalCtrl'
    });
})();
