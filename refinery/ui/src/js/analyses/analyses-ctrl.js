angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', '$rootScope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout, $rootScope) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};
  vm.analysesList = [];
  vm.analysesGlobalDetail = {};
  vm.analysesRunningList = [];
  vm.analysesGlobalList = [];

  vm.updateAnalysesList = function () {
    analysesFactory.getAnalysesList().then(function () {
      vm.analysesList = analysesFactory.analysesList;
      vm.refreshAnalysesDetail();
    });

    var timerList =  $timeout(vm.updateAnalysesList, 30000);

    $scope.$on('refinery/analyze-tab-inactive', function(){
      $timeout.cancel(timerList);
    });
  };

  vm.updateAnalysesRunningGlobalList = function () {
    analysesFactory.getAnalysesRunningGlobalList().then(function () {
      vm.analysesGlobalRunningList = analysesFactory.analysesGlobalRunningList;
    });
    $timeout(vm.updateAnalysesRunningGlobalList, 10000);
  };

  vm.updateAnalysesRunningList = function () {
    analysesFactory.getAnalysesRunningList().then(function () {
      vm.analysesRunningList = analysesFactory.analysesRunningList;
    });
    $timeout(vm.updateAnalysesRunningList, 5000);
  };

  vm.refreshAnalysesGlobalDetail = function(){
     console.log("in refresh analyses global detail");
    var timerDetail;
    for (var i = 0; i < vm.analysesRunningGlobalUuids.length; i++) {
      vm.updateAnalysesGlobalDetail(i);
    }
  };

  vm.refreshAnalysesDetail = function () {
    for (var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysesGlobalDetail[vm.analysesRunningUuids[i]];
    }
  };

  vm.updateAnalysesGlobalDetail = function (i) {
    (function (i) {
      analysesFactory.getAnalysesDetail(vm.analysesRunningGlobalUuids[i]).then(function (response) {
        vm.analysesGlobalDetail[vm.analysesRunningGlobalUuids[i]] = analysesFactory.analysesGlobalDetail[vm.analysesRunningGlobalUuids[i]];
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
    if (vm.analysesRunningList.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  vm.isAnalysesRunningGlobal = function () {
    if (vm.analysesRunningGlobalList.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  //watches for analyze tab view to update AnalysesList
  $scope.$on('refinery/analyze-tab-active', function () {
    vm.updateAnalysesList();
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
    $('.popover').on('mouseenter', function() {
      $rootScope.insidePopover = true;
      $scope.updateAnalysesGlobalList();
    });
    $('.popover').on('mouseleave', function() {
      $rootScope.insidePopover = false;
      $(element).popover('hide');
      $scope.updateAnalysesGlobalList("once");
    });
  };

  $scope.updateAnalysesGlobalList = function (timerStatus) {
    timerStatus = timerStatus || "";

    analysesFactory.getAnalysesGlobalList().then(function () {
      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
      vm.refreshAnalysesGlobalDetail();
    });
    var timerGlobalList = $timeout($scope.updateAnalysesGlobalList, 10000);

    if(timerStatus === "once"){
      console.log("Stop the analysesGlobalList");
      $timeout.cancel(timerGlobalList);
    }
  };

  if(!(typeof dataSetUuid === 'undefined' || dataSetUuid === "None")) {
    vm.updateAnalysesRunningList();
  }
}
