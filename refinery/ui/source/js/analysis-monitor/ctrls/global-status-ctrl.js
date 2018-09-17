/**
 * Analysis Monitor Global Status Ctrl
 * @namespace AnalysisMonitorGlobalStatusCtrl
 * @desc Component controller for the global list icon status in the nav
 * bar. Partial also contains the popover initializer.
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalStatusCtrl', AnalysisMonitorGlobalStatusCtrl);

  AnalysisMonitorGlobalStatusCtrl.$inject = [
    '$scope',
    '$timeout',
    'analysisMonitorFactory'
  ];

  function AnalysisMonitorGlobalStatusCtrl (
    $scope,
    $timeout,
    analysisMonitorFactory
  ) {
    var vm = this;
    var factory = analysisMonitorFactory;

    vm.analysesRunningGlobalCount = 0;
    vm.updateAnalysesRunningGlobalCount = updateAnalysesRunningGlobalCount;

   /*
   * ---------------------------------------------------------
   * Life-style hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.updateAnalysesRunningGlobalCount();
    };

   /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
     /**
     * @name updateAnalysesRunningGlobalCount
     * @desc  Method always runs to show running number on global analysis icon
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalListStatusCtrl
    **/
    function updateAnalysesRunningGlobalCount () {
      var params = {
        format: 'json',
        limit: 0,
        status__in: 'RUNNING,UNKNOWN',
        meta_only: true
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalCount = factory.docCount[params.status__in];
        vm.launchAnalysisFlag = false;
      });
       // refreshes every 30 seconds
      vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalCount, 30000);
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // Analysis launched, increases global count
    $scope.$on('rf/launchAnalysis', function () {
      vm.analysesRunningGlobalCount = vm.analysesRunningGlobalCount + 1;
    });
    // Analysis launched, decreases global count
    $scope.$on('rf/cancelAnalysis', function () {
      vm.analysesRunningGlobalCount =
        vm.analysesRunningGlobalCount - 1;
    });
  }
})();
