(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalListStatusCtrl', AnalysisMonitorGlobalListStatusCtrl);

  AnalysisMonitorGlobalListStatusCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorGlobalListStatusCtrl ($timeout, analysisMonitorFactory) {
    var vm = this;
    var factory = analysisMonitorFactory;

    vm.analysesRunningGlobalList = [];
    vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalList.length;
    vm.launchAnalysisFlag = false;
    vm.updateAnalysesRunningGlobalList = updateAnalysesRunningGlobalList;

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
        status__in: 'RUNNING,UNKNOWN'
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalList =
          factory.analysesRunningGlobalList;
        vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalList.length;
        vm.launchAnalysisFlag = false;
      });
      vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 30000);
    }

    vm.$onInit = function () {
      vm.updateAnalysesRunningGlobalList();
    };
  }
})();
