angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', '$rootScope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout, $rootScope) {
  "use strict";
  var vm = this;
  vm.analysesList = [];
  vm.analysesGlobalList = [];
  vm.analysesDetail = {};
  vm.analysesGlobalDetail = {};
  vm.analysesRunningList = [];
  vm.analysesRunningGlobalList = [];
  var timerGlobalList;

  /*Updates overall analyses lists*/
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

  vm.updateAnalysesGlobalList = function () {
    analysesFactory.getAnalysesGlobalList().then(function () {
      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
      vm.refreshAnalysesGlobalDetail();
    });
    timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 30000);
  };

  vm.cancelTimerGlobalList = function(){
    if(typeof timerGlobalList !== "undefined") {
      $timeout.cancel(timerGlobalList);
    }
  };

  /*Updates analyses list which are running.*/
  vm.updateAnalysesRunningList = function () {
    analysesFactory.getAnalysesRunningList().then(function () {
      vm.analysesRunningList = analysesFactory.analysesRunningList;
    });
    var timerRunList = $timeout(vm.updateAnalysesRunningList, 30000);

    if(typeof dataSetUuid === 'undefined' || dataSetUuid === "None"){
      $timeout.cancel(timerRunList);
    }
  };

  vm.updateAnalysesRunningGlobalList = function () {
    analysesFactory.getAnalysesRunningGlobalList().then(function () {
      vm.analysesRunningGlobalList = analysesFactory.analysesRunningGlobalList;
    });
    $timeout(vm.updateAnalysesRunningGlobalList, 30000);
  };

  /*Updates the running analyses stage details*/
  vm.refreshAnalysesDetail = function () {
    vm.analysesRunningList = analysesFactory.analysesRunningList;
    for (var i = 0; i < vm.analysesRunningList.length; i++) {
      vm.updateAnalysesDetail(i);
    }
  };

  vm.refreshAnalysesGlobalDetail = function(){
    vm.analysesRunningGlobalList = analysesFactory.analysesRunningGlobalList;
    for (var i = 0; i < vm.analysesRunningGlobalList.length; i++) {
      vm.updateAnalysesGlobalDetail(i);
    }
  };

  vm.updateAnalysesDetail = function (i) {
    (function (i) {
      if(typeof vm.analysesRunningList[i] !== 'undefined') {
        analysesFactory.getAnalysesDetail(vm.analysesRunningList[i].uuid).then(function (response) {
          vm.analysesDetail[vm.analysesRunningList[i].uuid] = analysesFactory.analysesDetail[vm.analysesRunningList[i].uuid];
        });
      }
    })(i);
  };

  vm.updateAnalysesGlobalDetail = function (i) {
    (function (i) {
      if(typeof vm.analysesRunningGlobalList[i] !== 'undefined') {
        analysesFactory.getAnalysesDetail(vm.analysesRunningGlobalList[i].uuid).then(function (response) {
          vm.analysesGlobalDetail[vm.analysesRunningGlobalList[i].uuid] = analysesFactory.analysesDetail[vm.analysesRunningGlobalList[i].uuid];
        });
      }
    })(i);
  };

  //Cancels a running analyses
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

  //Alert message which show on analysis view filtered page
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
    if(vm.analysesRunningGlobalList.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  vm.isEmptyAnalysesGlobalList = function(){
    if(vm.analysesGlobalList.length > 0){
      return false;
    }else{
      return true;
    }
  };

  //custom popover event allowing hovering over textbox.
  vm.analysesPopoverEvents = function (element) {
    $('.popover').on('mouseenter', function() {
      $rootScope.insidePopover = true;
    });
    $('.popover').on('mouseleave', function() {
      $rootScope.insidePopover = false;
      $(element).popover('hide');
      vm.cancelTimerGlobalList();
    });
  };

  //checks url to see if view is filtered by analysis in data_set.html. Used
  // with analyses alert msg.
  $scope.checkAnalysesViewFlag = function () {
    var flag;
    if (typeof window.analysisUuid === 'undefined' || window.analysisUuid === "None") {
      flag = false;
    } else {
      flag = true;
    }
    return flag;
  };

}
