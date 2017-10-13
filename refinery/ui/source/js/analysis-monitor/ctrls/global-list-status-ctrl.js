/**
 * Analysis Monitor Global List Status Ctrl
 * @namespace AnalysisMonitorGlobalListStatusCtrl
 * @desc Component controller for the global list icon status in the nav
 * bar. Partial also contains the popover initializer.
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalListStatusCtrl', AnalysisMonitorGlobalListStatusCtrl);

  AnalysisMonitorGlobalListStatusCtrl.$inject = [
    '$scope',
    '$timeout',
    'analysisMonitorFactory'
  ];

  function AnalysisMonitorGlobalListStatusCtrl (
    $scope,
    $timeout,
    analysisMonitorFactory
  ) {
    var vm = this;
    var factory = analysisMonitorFactory;

    vm.analysesRunningGlobalListCount = 0;
    vm.updateAnalysesRunningGlobalListCount = updateAnalysesRunningGlobalListCount;

   /*
   * ---------------------------------------------------------
   * Life-style hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.updateAnalysesRunningGlobalList();
    };

   /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
     /**
     * @name updateAnalysesRunningGlobalListCount
     * @desc  Method always runs to show running number on global analysis icon
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalListStatusCtrl
    **/
    function updateAnalysesRunningGlobalListCount () {
      var params = {
        format: 'json',
        limit: 0,
        status__in: 'RUNNING,UNKNOWN',
        meta_only: true
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalListCount = factory.docCount[params.status__in];
        vm.launchAnalysisFlag = false;
      });
       // refreshes every 30 seconds
      vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 30000);
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // Analysis launched, increases global count
    $scope.$on('rf/launchAnalysis', function () {
      vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalListCount + 1;
    });
    // Analysis launched, decreases global count
    $scope.$on('rf/cancelAnalysis', function () {
      vm.analysesRunningGlobalListCount =
        vm.analysesRunningGlobalListCount - 1;
    });
  }
})();
