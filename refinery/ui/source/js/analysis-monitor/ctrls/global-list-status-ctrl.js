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

    vm.analysesRunningGlobalListCount = factory.docCount;
    vm.updateAnalysesRunningGlobalList = updateAnalysesRunningGlobalList;

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
   // Method always runs to show running number on global analysis icon
    function updateAnalysesRunningGlobalList () {
      var params = {
        format: 'json',
        limit: 0,
        status__in: 'RUNNING,UNKNOWN',
        meta_only: true
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalListCount = factory.docCount;
        vm.launchAnalysisFlag = false;
      });
      vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 30000);
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    $scope.$on('rf/launchAnalysis', function () {
      vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalListCount + 1;
    });

    $scope.$on('rf/cancelAnalysis', function () {
      vm.analysesRunningGlobalListCount =
        vm.analysesRunningGlobalListCount - 1;
    });
  }
})();
