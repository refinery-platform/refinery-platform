'use strict';

function AnalysisMonitorCtrl (
  $rootScope,
  $scope,
  $timeout,
  $uibModal,
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
  vm.openAnalysisDeleteModal = openAnalysisDeleteModal;

  vm.$onDestroy = function () {
    $timeout.cancel(vm.timerList);
  };

  // On data set browser analysis tab, method set timer and refreshes the
  // analysis list and refreshes details for running analyses.
  vm.updateAnalysesList = function () {
    var param = {
      data_set_uuid: $window.dataSetUuid
    };

    vm.timerList = $timeout(vm.updateAnalysesList, 15000);

    return analysisMonitorFactory.getAnalysesList(param)
      .then(function (response) {
        vm.analysesList = analysisMonitorFactory.analysesList;
        vm.setAnalysesLoadingFlag();
        vm.refreshAnalysesDetail();
        return response;
      });
  };

  vm.cancelAnalysis = function (uuid) {
    vm.setCancelAnalysisFlag(true, uuid);

    analysisMonitorFactory.postCancelAnalysis(uuid)
      .then(function () {
        // Immediate refresh of analysis list
        $timeout.cancel(vm.timerList);

        vm.updateAnalysesList().then(function () {
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

  /**
   * @name getRunningAnalyses
   * @desc  Helper function to update running analyses with details
   * @memberOf refineryAnalysisMonitor.AnalysisMonitorGlobalPopoverCtrl
  **/
  function getRunningAnalyses () {
    var runningList = [];
    for (var i = 0; i < vm.analysesList.length; i++) {
      if (vm.analysesList[i].status === 'RUNNING') {
        runningList.push(vm.analysesList[i]);
      }
    }
    return runningList;
  }

  vm.refreshAnalysesDetail = function () {
    vm.analysesRunningList = getRunningAnalyses();
    for (var i = 0; i < vm.analysesRunningList.length; i++) {
      vm.updateAnalysesDetail(i);
    }
  };

  // Analysis monitor details gets populated from service - tabular
  vm.updateAnalysesDetail = function (i) {
    (function (j) {
      var runningUuid = vm.analysesRunningList[j].uuid;
      analysisMonitorFactory.getAnalysesDetail(runningUuid).then(function () {
        vm.analysesDetail[runningUuid] =
          analysisMonitorFactory.analysesDetail[runningUuid];
      });
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

   /**
   * @name openAnalysisDeleteModal
   * @desc  view method which opens the delete component
   * @memberOf refineryAnalysisMonitor.AnalysisMonitorCtrl
   * @param {obj} analysis - api sent analysis object
  **/
  function openAnalysisDeleteModal (analysis) {
    var modalInstance = $uibModal.open({
      component: 'rpAnalysisDeleteModal',
      resolve: {
        config: function () {
          return {
            analysis: analysis,
            model: 'analyses',
            uuid: analysis.uuid
          };
        }
      }
    });
    modalInstance.result.then(function () {
      vm.updateAnalysesList();
    });
  }

  // Close ui-grid popover when tabbing
  fileRelationshipService.hideNodePopover = true;
}

angular
  .module('refineryAnalysisMonitor')
  .controller('AnalysisMonitorCtrl', [
    '$rootScope',
    '$scope',
    '$timeout',
    '$uibModal',
    '$window',
    'analysisMonitorFactory',
    'fileRelationshipService',
    AnalysisMonitorCtrl
  ]);
