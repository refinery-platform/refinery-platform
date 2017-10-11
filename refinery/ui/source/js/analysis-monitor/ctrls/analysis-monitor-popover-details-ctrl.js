(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorPopoverDetailsCtrl', AnalysisMonitorPopoverDetailsCtrl);

  AnalysisMonitorPopoverDetailsCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorPopoverDetailsCtrl ($timeout, analysisMonitorFactory) {
    var vm = this;
    vm.analysesGlobalLoadingFlag = 'LOADING';
    vm.analysesGlobalList = [];
    vm.analysesGlobalDetail = {};
    vm.cancelTimerRunningGlobalList = cancelTimerRunningGlobalList;
    vm.isAnalysesRunningGlobal = isAnalysesRunningGlobal;
    vm.refreshAnalysesGlobalDetail = refreshAnalysesGlobalDetail;
    vm.setAnalysesGlobalLoadingFlag = setAnalysesGlobalLoadingFlag;
    vm.updateAnalysesGlobalList = updateAnalysesGlobalList;

   /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function cancelTimerRunningGlobalList () {
      if (typeof vm.timerRunGlobalList !== 'undefined') {
        $timeout.cancel(vm.timerRunGlobalList);
      }
    }

    function isAnalysesRunningGlobal () {
      if (
        typeof vm.analysesRunningGlobalList !== 'undefined' &&
        vm.analysesRunningGlobalList.length > 0
      ) {
        return true;
      }
      return false;
    }

    function refreshAnalysesGlobalDetail () {
      vm.analysesRunningGlobalList =
        analysisMonitorFactory.analysesRunningGlobalList;
      for (var i = 0; i < vm.analysesRunningGlobalList.length; i++) {
        vm.updateAnalysesGlobalDetail(i);
      }
    }

    function setAnalysesGlobalLoadingFlag () {
      if (vm.analysesGlobalList.length === 0) {
        vm.analysesGlobalLoadingFlag = 'EMPTY';
      } else {
        vm.analysesGlobalLoadingFlag = 'DONE';
      }
    }

    // On global analysis icon, method set timer and refreshes the
    // analysis list and refreshes details for running analyses.
    function updateAnalysesGlobalList () {
      var params = {
        format: 'json',
        limit: 10
      };

      analysisMonitorFactory.getAnalysesList(params).then(function () {
        vm.analysesGlobalList = analysisMonitorFactory.analysesGlobalList;
        console.log(vm.analysesGlobalList);
        vm.setAnalysesGlobalLoadingFlag();
        vm.refreshAnalysesGlobalDetail();
      });

      vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 10000);
    }

    vm.$onInit = function () {
      vm.updateAnalysesGlobalList();
    };

    vm.$onDestroy = function () {
      vm.cancelTimerRunningGlobalList();
    };
  }
})();
