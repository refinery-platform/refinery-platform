(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorPopoverCtrl', AnalysisMonitorPopoverCtrl);

  AnalysisMonitorPopoverCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorPopoverCtrl ($timeout, analysisMonitorFactory) {
    var vm = this;
    vm.factory = analysisMonitorFactory;

    vm.analysesGlobalLoadingFlag = 'LOADING';
    vm.analysesGlobalList = [];
    vm.analysesGlobalDetail = {};
    vm.cancelTimerGlobalList = cancelTimerGlobalList;
    vm.isAnalysesRunningGlobal = isAnalysesRunningGlobal;
    vm.refreshAnalysesGlobalDetail = refreshAnalysesGlobalDetail;
    vm.setAnalysesGlobalLoadingFlag = setAnalysesGlobalLoadingFlag;
    vm.updateAnalysesGlobalList = updateAnalysesGlobalList;

   /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function cancelTimerGlobalList () {
      if (typeof vm.timerGlobalList !== 'undefined') {
        $timeout.cancel(vm.timerGlobalList);
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
        vm.factory.analysesRunningGlobalList;
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
        vm.analysesGlobalList = vm.factory.analysesGlobalList;
        vm.setAnalysesGlobalLoadingFlag();
        vm.refreshAnalysesGlobalDetail();
      });

      vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 10000);
    }

    vm.$onInit = function () {
      vm.updateAnalysesGlobalList();
    };

    vm.$onDestroy = function () {
      vm.cancelTimerGlobalList();
    };
  }
})();
