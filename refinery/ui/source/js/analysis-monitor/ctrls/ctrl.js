'use strict';

function AnalysisMonitorCtrl (
  $rootScope,
  $scope,
  $timeout,
  $window,
  analysisMonitorFactory,
  fileRelationshipService
) {
  var vm = this;
  // Long list of analysis
  vm.analysesList = analysisMonitorFactory.analysesList;
  // Details for running analyses
  vm.analysesDetail = {};
  // For analysis tab & global running icons also manage showing analyses
  // details
  vm.analysesRunningList = [];
  // For refreshing lists
  vm.timerList = undefined;
  vm.timerRunList = undefined;
  // Used for UI displays
  vm.launchAnalysisFlag = false;
  vm.analysesLoadingFlag = 'LOADING';
  vm.initializedFlag = {};

  // On data set browser analysis tab, method set timer and refreshes the
  // analysis list and refreshes details for running analyses.
  vm.updateAnalysesList = function () {
    var param = {
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

  vm.cancelTimerRunningList = function () {
    if (typeof vm.timerRunList !== 'undefined') {
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.refreshAnalysesDetail = function () {
    vm.analysesRunningList = analysisMonitorFactory.analysesRunningList;
    for (var i = 0; i < vm.analysesRunningList.length; i++) {
      vm.updateAnalysesDetail(i);
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

  vm.isAnalysisDetailLoaded = function (uuid) {
    if (typeof vm.analysesDetail[uuid] !== 'undefined') {
      return true;
    }
    return false;
  };

  // Close ui-grid popover when tabbing
  fileRelationshipService.hideNodePopover = true;
}

angular
  .module('refineryAnalysisMonitor')
  .controller('AnalysisMonitorCtrl', [
    '$rootScope',
    '$scope',
    '$timeout',
    '$window',
    'analysisMonitorFactory',
    'fileRelationshipService',
    AnalysisMonitorCtrl
  ]);
