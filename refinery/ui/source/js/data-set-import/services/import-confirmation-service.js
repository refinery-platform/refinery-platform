/**
 * Import Confirmation Service
 * @namespace ImportConfirmationService
 * @desc Service for displaying a warning when a User performs a
 * metadata revision.
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .service('importConfirmationService', ImportConfirmationService);

  ImportConfirmationService.$inject = ['$uibModal', '$window'];

  function ImportConfirmationService ($uibModal, $window) {
    var vm = this;

    vm.showConfirmation = function (parentScope) {
      var modalInstance = $uibModal.open({
        animation: true,
        templateUrl: $window.getStaticUrl(
          'partials/data-set-import/partials/import-confirmation.html'
        ),
        controller: 'ImportConfirmationModalCtrl as modal'
      });

      modalInstance.result.then(function () {
        parentScope.startImport();
      });
    };
  }
})();
