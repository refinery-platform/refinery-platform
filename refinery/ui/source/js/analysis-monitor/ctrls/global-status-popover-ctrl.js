/**
 * Analysis Monitor Global Status Popover Ctrl
 * @namespace AnalysisMonitorGlobalStatusPopoverCtrl
 * @desc Component controller for the global list icon status popover in the navbar.
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular
    .module('refineryAnalysisMonitor')
    .controller('AnalysisMonitorGlobalStatusPopoverCtrl', AnalysisMonitorGlobalStatusPopoverCtrl);

  AnalysisMonitorGlobalStatusPopoverCtrl.$inject = ['$timeout', 'analysisMonitorFactory'];

  function AnalysisMonitorGlobalStatusPopoverCtrl ($timeout, analysisMonitorFactory) {
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
    /**
     * @name cancelTimerGlobalList
     * @desc  Cancels timer which automatically triggers updating the info
     * in the popover
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
    function cancelTimerGlobalList () {
      if (typeof vm.timerGlobalList !== 'undefined') {
        $timeout.cancel(vm.timerGlobalList);
      }
    }

     /**
     * @name refreshAnalysesGlobalDetail
     * @desc  Updates the global list and then updates each set of details
      * for the individual stage statues
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
    function refreshAnalysesGlobalDetail () {
      updateAnalysesRunningGlobalList();
      for (var i = 0; i < vm.analysesRunningGlobalList.length; i++) {
        vm.updateAnalysesGlobalDetail(i);
      }
    }

    /**
     * @name setAnalysesGlobalLoadingFlag
     * @desc  View flag which checks to see if there's any analyses
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
    function setAnalysesGlobalLoadingFlag () {
      if (vm.analysesGlobalList.length === 0) {
        vm.analysesGlobalLoadingFlag = 'EMPTY';
      } else {
        vm.analysesGlobalLoadingFlag = 'DONE';
      }
    }


    /**
     * @name updateAnalysesGlobalDetail
     * @desc  Analysis monitor details are updated with details
      * for the individual stage statues (Different API to get these details)
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
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

    /**
     * @name updateAnalysesGlobalList
     * @desc  Updates the list of last 10 ran analysis which user has view
     * permissions
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
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
      // refreshes every 30 seconds
      vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 30000);
    }

    /**
     * @name updateAnalysesRunningGlobalList
     * @desc  Updates the list showing all running analysis
     * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
    **/
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
