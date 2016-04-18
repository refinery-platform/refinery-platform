'use strict';

function AnalysisMonitorCtrl (
  $rootScope,
  $scope,
  $timeout,
  $window,
  analysisMonitorFactory,
  analysisMonitorAlertService
) {
  var vm = this;
  // Long list of analysis
  vm.analysesList = [];
  vm.analysesGlobalList = [];
  // Details for running analyses
  vm.analysesDetail = {};
  vm.analysesGlobalDetail = {};
  // For analysis tab & global running icons also manage showing analyses
  // details
  vm.analysesRunningList = [];
  vm.analysesRunningGlobalList = [];
  // For refreshing lists
  vm.timerList = undefined;
  vm.timerGlobalList = undefined;
  vm.timerRunGlobalList = undefined;
  vm.timerRunList = undefined;
  // Used for UI displays
  vm.launchAnalysisFlag = false;
  vm.analysesRunningGlobalListCount = 0;
  vm.analysesLoadingFlag = 'LOADING';
  vm.analysesGlobalLoadingFlag = 'LOADING';
  vm.initializedFlag = {};

  // On data set browser analysis tab, method set timer and refreshes the
  // analysis list and refreshes details for running analyses.
  vm.updateAnalysesList = function () {
    var param = {
      format: 'json',
      limit: 0,
      data_set__uuid: $window.dataSetUuid
    };

    vm.timerList = $timeout(vm.updateAnalysesList, 15000);
    // Cancels timer when away from analyses tab
    $scope.$on('refinery/analyze-tab-inactive', function () {
      $timeout.cancel(vm.timerList);
    });

    return analysisMonitorFactory.getAnalysesList(param)
      .then(function (response) {
        vm.analysesList = analysisMonitorFactory.analysesList;
        vm.setAnalysesLoadingFlag();
        vm.refreshAnalysesDetail();
        return response;
      });
  };

  // On global analysis icon, method set timer and refreshes the
  // analysis list and refreshes details for running analyses.
  vm.updateAnalysesGlobalList = function () {
    var params = {
      format: 'json',
      limit: 10
    };

    analysisMonitorFactory.getAnalysesList(params).then(function () {
      vm.analysesGlobalList = analysisMonitorFactory.analysesGlobalList;
      vm.setAnalysesGlobalLoadingFlag();
      vm.refreshAnalysesGlobalDetail();
    });

    vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 30000);
  };

  // This method runs when user is in the data set browser. It triggers
  // the analysis running icon on tab
  vm.updateAnalysesRunningList = function () {
    var params = {
      format: 'json',
      limit: 0,
      data_set__uuid: $window.dataSetUuid,
      status__in: 'RUNNING,UNKNOWN'
    };

    analysisMonitorFactory.getAnalysesList(params).then(function () {
      vm.analysesRunningList = analysisMonitorFactory.analysesRunningList;
      vm.launchAnalysisFlag = false;
    });

    vm.timerRunList = $timeout(vm.updateAnalysesRunningList, 10000);

    // Cancels when user is away from dataset browser
    if (
      typeof $window.dataSetUuid === 'undefined' ||
      $window.dataSetUuid === 'None'
    ) {
      $timeout.cancel(vm.timerRunList);
    }
  };

  // Method always runs to show running number on global analysis icon
  vm.updateAnalysesRunningGlobalList = function () {
    var params = {
      format: 'json',
      limit: 0,
      status__in: 'RUNNING,UNKNOWN'
    };

    analysisMonitorFactory.getAnalysesList(params).then(function () {
      vm.analysesRunningGlobalList =
        analysisMonitorFactory.analysesRunningGlobalList;
      vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalList.length;
      vm.launchAnalysisFlag = false;
    });
    vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 30000);

    if (
      typeof $window.dataSetUuid === 'undefined' ||
      $window.dataSetUuid === 'None'
    ) {
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.cancelAnalysis = function (uuid) {
    vm.setCancelAnalysisFlag(true, uuid);

    analysisMonitorFactory.postCancelAnalysis(uuid)
      .then(function () {
        // Immediate refresh of analysis list
        $timeout.cancel(vm.timerList);

        vm.updateAnalysesList().then(function () {
          $rootScope.$broadcast('rf/cancelAnalysis');
          // Removes flag because list is updated
          vm.setCancelAnalysisFlag(false, uuid);
        });
      }, function () {
        vm.setCancelAnalysisFlag(false, uuid);
      });
  };

  /** HELPER FUNCTIONS **/
  vm.setAnalysesLoadingFlag = function () {
    if (vm.analysesList.length === 0) {
      vm.analysesLoadingFlag = 'EMPTY';
    } else {
      vm.analysesLoadingFlag = 'DONE';
    }
  };

  vm.setAnalysesGlobalLoadingFlag = function () {
    if (vm.analysesGlobalList.length === 0) {
      vm.analysesGlobalLoadingFlag = 'EMPTY';
    } else {
      vm.analysesGlobalLoadingFlag = 'DONE';
    }
  };

  vm.cancelTimerGlobalList = function () {
    if (typeof vm.timerGlobalList !== 'undefined') {
      $timeout.cancel(vm.timerGlobalList);
    }
  };

  vm.cancelTimerRunningList = function () {
    if (typeof vm.timerRunList !== 'undefined') {
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.cancelTimerRunningGlobalList = function () {
    if (typeof vm.timerRunGlobalList !== 'undefined') {
      $timeout.cancel(vm.timerRunGlobalList);
    }
  };

  vm.refreshAnalysesDetail = function () {
    vm.analysesRunningList = analysisMonitorFactory.analysesRunningList;
    for (var i = 0; i < vm.analysesRunningList.length; i++) {
      vm.updateAnalysesDetail(i);
    }
  };

  vm.refreshAnalysesGlobalDetail = function () {
    vm.analysesRunningGlobalList =
      analysisMonitorFactory.analysesRunningGlobalList;
    for (var i = 0; i < vm.analysesRunningGlobalList.length; i++) {
      vm.updateAnalysesGlobalDetail(i);
    }
  };

  // Analysis monitor details gets populated from service - tabular
  vm.updateAnalysesDetail = function (i) {
    (function (j) {
      if (typeof vm.analysesRunningList[j] !== 'undefined') {
        var runningUuid = vm.analysesRunningList[j].uuid;
        analysisMonitorFactory.getAnalysesDetail(runningUuid).then(function () {
          vm.analysesDetail[runningUuid] =
            analysisMonitorFactory.analysesDetail[runningUuid];
        });
      }
    }(i));
  };

  // Analysis monitor details gets populated from service - global
  vm.updateAnalysesGlobalDetail = function (i) {
    (function (j) {
      if (typeof vm.analysesRunningGlobalList[j] !== 'undefined') {
        var runningUuid = vm.analysesRunningGlobalList[j].uuid;
        analysisMonitorFactory.getAnalysesDetail(runningUuid).then(function () {
          vm.analysesGlobalDetail[runningUuid] =
            analysisMonitorFactory.analysesDetail[runningUuid];
        });
      }
    }(i));
  };

  vm.setCancelAnalysisFlag = function (logic, uuid) {
    if (typeof vm.analysesDetail[uuid] !== 'undefined') {
      vm.analysesDetail[uuid].cancelingAnalyses = logic;
    } else {
      vm.initializedFlag[uuid] = logic;
    }
  };

  vm.isAnalysesRunning = function () {
    if (
      typeof vm.analysesRunningList !== 'undefined' &&
      vm.analysesRunningList.length > 0
    ) {
      return true;
    }
    return false;
  };

  vm.isAnalysesRunningGlobal = function () {
    if (
      typeof vm.analysesRunningGlobalList !== 'undefined' &&
      vm.analysesRunningGlobalList.length > 0
    ) {
      return true;
    }
    return false;
  };

  vm.isEmptyAnalysesGlobalList = function () {
    if (
      typeof vm.analysesRunningList !== 'undefined' &&
      vm.analysesGlobalList.length > 0
    ) {
      return false;
    }
    return true;
  };

  vm.isAnalysisDetailLoaded = function (uuid) {
    if (typeof vm.analysesDetail[uuid] !== 'undefined') {
      return true;
    }
    return false;
  };

  // Alert message which show on analysis view filtered page
  vm.setAnalysesAlertMsg = function () {
    var uuid = window.analysisUuid;
    analysisMonitorAlertService.setAnalysesMsg(uuid);
    vm.analysesMsg = analysisMonitorAlertService.getAnalysesMsg();
  };

  // checks url to see if view is filtered by analysis in data_set.html. Used
  // with analyses alert msg.
  $scope.checkAnalysesViewFlag = function () {
    var flag;
    if (
      typeof window.analysisUuid === 'undefined' ||
      window.analysisUuid === 'None'
    ) {
      flag = false;
    } else {
      flag = true;
    }
    return flag;
  };
}

angular
  .module('refineryAnalysisMonitor')
  .controller('AnalysisMonitorCtrl', [
    '$rootScope',
    '$scope',
    '$timeout',
    '$window',
    'analysisMonitorFactory',
    'analysisMonitorAlertService',
    AnalysisMonitorCtrl
  ]);
