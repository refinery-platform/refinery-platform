(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalPopoverCtrl', AnalysisMonitorGlobalPopoverCtrl);

  AnalysisMonitorGlobalPopoverCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorGlobalPopoverCtrl ($timeout, analysisMonitorFactory) {
    var vm = this;
    var factory = analysisMonitorFactory;

    vm.analysesGlobalLoadingFlag = 'LOADING';
    vm.analysesGlobalList = [];
    vm.analysesGlobalDetail = {};
    vm.analysesRunningGlobalList = [];
    vm.cancelTimerGlobalList = cancelTimerGlobalList;
    vm.refreshAnalysesGlobalDetail = refreshAnalysesGlobalDetail;
    vm.setAnalysesGlobalLoadingFlag = setAnalysesGlobalLoadingFlag;
    vm.updateAnalysesGlobalDetail = updateAnalysesGlobalDetail;
    vm.updateAnalysesGlobalList = updateAnalysesGlobalList;
    vm.updateAnalysesRunningGlobalList = updateAnalysesRunningGlobalList;

  /*
   * ---------------------------------------------------------
   * Life-style hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.updateAnalysesGlobalList();
    };

    vm.$onDestroy = function () {
      vm.cancelTimerGlobalList();
    };
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

    function refreshAnalysesGlobalDetail () {
      updateAnalysesRunningGlobalList();
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

    // Analysis monitor details gets populated from service - global
    function updateAnalysesGlobalDetail (i) {
      (function (j) {
        if (typeof vm.analysesRunningGlobalList[j] !== 'undefined') {
          var runningUuid = vm.analysesRunningGlobalList[j].uuid;
          factory.getAnalysesDetail(runningUuid).then(function () {
            vm.analysesGlobalDetail[runningUuid] =
              factory.analysesDetail[runningUuid];
          });
        }
      }(i));
    }

    // On global analysis icon, method set timer and refreshes the
    // analysis list and refreshes details for running analyses.
    function updateAnalysesGlobalList () {
      var params = {
        format: 'json',
        limit: 10
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesGlobalList = factory.analysesGlobalList;
        vm.setAnalysesGlobalLoadingFlag();
        vm.refreshAnalysesGlobalDetail();
      });

      vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 5000);
    }

       // Method always runs to show running number on global analysis icon
    function updateAnalysesRunningGlobalList () {
      var params = {
        format: 'json',
        limit: 0,
        status__in: 'RUNNING,UNKNOWN'
      };

      factory.getAnalysesList(params).then(function () {
        vm.analysesRunningGlobalList = factory.analysesRunningGlobalList;
      });
    }
  }
})();
