angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', '$rootScope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout, $rootScope) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};
  vm.analysesRunningUuids = [];
  vm.analysesGlobalList = [];
  vm.analysesRunningGlobalUuids = [];
  vm.analysesGlobalDetail = {};
  //vm.allAnalysesRunningUuids = [];

  vm.updateAnalysesList = function () {
    analysesFactory.getAnalysesList().then(function () {
      vm.analysesList = analysesFactory.analysesList;
      vm.analysesRunningUuids = analysesFactory.createAnalysesRunningList(vm.analysesList);

    });

    $timeout(vm.updateAnalysesList, 10000);
  };

  vm.updateAnalysesGlobalList = function () {
    analysesFactory.getAnalysesGlobalList().then(function () {
      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
      vm.analysesRunningGlobalUuids = analysesFactory.createAnalysesRunningList(vm.analysesGlobalList);
      vm.refreshAnalysesDetail();
    });
    $timeout(vm.updateAnalysesGlobalList, 10000);
  };

  vm.refreshAnalysesGlobalDetail = function(){
    var timerDetail;
    //vm.allAnalysesRunningUuids= vm.analysesRunningGlobalUuids.concat(vm.analysesRunningUuids);
    for (var i = 0; i < vm.analysesRunningGlobalUuids.length; i++) {
      vm.updateAnalysesGlobalDetail(i);
    }
    if (vm.analysesRunningGlobalUuids > 0) {
      timerDetail = $timeout(vm.refreshAnalysesGlobalDetail, 5000);
    }
    //else {
    //  $timeout.cancel(timerDetail);
    //}
  };

  vm.refreshAnalysesDetail = function () {
    var timerDetail;
    for (var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysesGlobalDetail[vm.analysesRunningUuids[i]];
    }
  };

  vm.updateAnalysesGlobalDetail = function (i) {
    (function (i) {
      analysesFactory.getAnalysesDetail(vm.analysesRunningGlobalUuids[i]).then(function (response) {
        vm.analysesGlobalDetail[vm.analysesRunningGlobalUuids[i]] = analysesFactory.analysesGlobalDetail[vm.analysesRunningGlobalUuids[i]];
        vm.refreshAnalysesDetail();
      });
    })(i);
  };

  vm.cancelAnalysis = function (uuid) {
    vm.analysesDetail[uuid].cancelingAnalyses = true;
    analysesFactory.postCancelAnalysis(uuid).then(function (result) {
      bootbox.alert("Successfully canceled analysis.");
      vm.analysesDetail[uuid].cancelingAnalyses = false;
      //vm.updateAnalysesList();
    }, function (error) {
      bootbox.alert("Canceling analysis failed");
      vm.analysesDetail[uuid].cancelingAnalyses = false;
    });
  };

  vm.setAnalysesAlertMsg = function () {
    var uuid = window.analysisUuid;
    analysesAlertService.setAnalysesMsg(uuid);
    vm.analysesMsg = analysesAlertService.getAnalysesMsg();
  };

  vm.isAnalysesRunning = function () {
    if (vm.analysesRunningUuids.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  //watches for analyze tab view to update AnalysesList
  $scope.$on('refinery/analyze-tab-active', function () {
    vm.refreshAnalysesGlobalDetail();
    //vm.refreshAnalysesDetail();
  });

  //checks url to see if view is filtered by analysis
  $scope.checkAnalysesViewFlag = function () {
    var flag;
    if (typeof window.analysisUuid === 'undefined' || window.analysisUuid === "None") {
      flag = false;
    } else {
      flag = true;
      vm.setAnalysesAlertMsg();
    }
    return flag;
  };

  //custom popover event allowing hovering over textbox.
  $scope.analysesPopoverEvents = function (element) {
    $('.popover').on('mouseenter', function () {
      $rootScope.insidePopover = true;
    });
    $('.popover').on('mouseleave', function () {
      $rootScope.insidePopover = false;
      $(element).popover('hide');
    });
  };

  //temporary solution until filter is added to updateAnalysesGlobalList
  if(!(typeof window.dataSetUuid === 'undefined' || window.dataSetUuid === "None")){
    vm.updateAnalysesList();
  }
  vm.updateAnalysesGlobalList();
}
