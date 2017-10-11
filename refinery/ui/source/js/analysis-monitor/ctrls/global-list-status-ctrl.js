(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalListStatusCtrl', AnalysisMonitorGlobalListStatusCtrl);

  AnalysisMonitorGlobalListStatusCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorGlobalListStatusCtrl ($timeout, analysisMonitorFactory) {
    var vm = this;
    vm.factory = analysisMonitorFactory;

    vm.analysesRunningGlobalList = vm.factory.analysesRunningGlobalList;
    vm.analysesRunningGlobalListCount = vm.factory.analysesRunningGlobalList.length;
    vm.launchAnalysisFlag = false;
    vm.isAnalysesRunningGlobal = isAnalysesRunningGlobal;
    vm.updateAnalysesRunningGlobalList = updateAnalysesRunningGlobalList;

   /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
    function isAnalysesRunningGlobal () {
      if (
        typeof vm.analysesRunningGlobalList !== 'undefined' &&
        vm.analysesRunningGlobalList.length > 0
      ) {
        return true;
      }
      return false;
    }

   // Method always runs to show running number on global analysis icon
    function updateAnalysesRunningGlobalList () {
      var params = {
        format: 'json',
        limit: 0,
        status__in: 'RUNNING,UNKNOWN'
      };

      vm.factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalList =
          vm.factory.analysesRunningGlobalList;
        vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalList.length;
        vm.launchAnalysisFlag = false;
      });
      vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 15000);
    }

    vm.$onInit = function () {
      vm.updateAnalysesRunningGlobalList();
    };
  }
})();

// 'use strict';
//
// function rpAnalysisMonitorGlobalListStatus ($window) {
//  return {
//    templateUrl: function () {
//      return $window.getStaticUrl('partials/analysis-monitor/partials/global-list-status.html');
//    },
//    restrict: 'AE',
//    controller: 'AnalysisMonitorCtrl',
//   // controllerAs: 'AMCtrl',
//   // bindToController: {
//   //   launchAnalysisFlag: '=?',
//   //   analysesRunningGlobalListCount: '=?',
//   //   analysesRunningGlobalList: '&?'
//   // },
//    link: function (scope, element, attr, ctrl) {
//      ctrl.updateAnalysesRunningGlobalList();
//
//      scope.$on('rf/launchAnalysis', function () {
//        ctrl.launchAnalysisFlag = true;
//        ctrl.analysesRunningGlobalListCount =
//          ctrl.analysesRunningGlobalListCount + 1;
//      });
//
//      scope.$on('rf/cancelAnalysis', function () {
//        ctrl.cancelTimerRunningGlobalList();
//        ctrl.analysesRunningGlobalListCount =
//          ctrl.analysesRunningGlobalListCount - 1;
//        ctrl.updateAnalysesRunningGlobalList();
//      });
//    }
//  };
// }
//
// angular
//  .module('refineryAnalysisMonitor')
//  .directive('rpAnalysisMonitorGlobalListStatus', [
//    '$window',
//    rpAnalysisMonitorGlobalListStatus
//  ]);
