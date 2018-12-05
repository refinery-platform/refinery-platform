/**
 * Analysis Delete Modal Ctrl
 * @namespace Analysis Delete Modal Ctrl
 * @desc Main controller for deleting an analysis
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('AnalysisDeleteModalCtrl', AnalysisDeleteModalCtrl);

  AnalysisDeleteModalCtrl.$inject = [
    '$log',
    'deletionService'
  ];

  function AnalysisDeleteModalCtrl (
    $log,
    deletionService
  ) {
    var vm = this;

    vm.alertType = 'info';
    vm.close = close;
    vm.deleteAnalysis = deleteAnalysis;
    vm.generateAlertMessage = generateAlertMessage;
    vm.isDeleting = false;
    vm.responseMessage = '';

    /*
     * ---------------------------------------------------------
     * Methods Definitions
     * ---------------------------------------------------------
     */
    /**
     * @name close
     * @desc  View method to close modals
     * @memberOf refineryApp.AnalysisDeleteModalCtrl
     **/
    function close () {
      vm.modalInstance.close(vm.alertType);
    }

    /**
     * @name generateAlertMessage
     * @desc  Helper method which generates api response message
     * @memberOf refineryApp.AnalysisDeleteModalCtrl
     **/
    function generateAlertMessage (infoType, analysisName) {
      if (infoType === 'success') {
        vm.alertType = 'success';
        vm.responseMessage = 'Successfully deleted analysis ' + analysisName;
      } else if (infoType === 'danger') {
        vm.alertType = 'danger';
        vm.responseMessage = 'Error deleting analysis.' + analysisName;
      }
    }

     /**
     * @name Delete Analysis
     * @desc  Main view method to delete analysis
     * @memberOf refineryApp.AnalysisDeleteModalCtrl
     **/
    function deleteAnalysis () {
      vm.isDeleting = true;
      deletionService.delete({
        model: 'analyses',
        uuid: vm.analysis.uuid
      }).$promise.then(function () {
        vm.isDeleting = false;
        generateAlertMessage('success', vm.analysis.name);
      }, function () {
        vm.isDeleting = false;
        generateAlertMessage('danger', vm.analysis.name);
      });
    }

    vm.$onInit = function () {
      vm.analysis = vm.resolve.config.analysis;
    };
  }
})();
