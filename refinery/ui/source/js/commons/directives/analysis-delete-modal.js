/**
 * Analysis Delete Modal
 * @namespace analysisDeleteModal
 * @desc Delete an analysis modal
 * @memberOf refineryApp.analysisDeleteModal
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpAnalysisDeleteModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/analysis-delete-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'AnalysisDeleteModalCtrl'
    });
})();
