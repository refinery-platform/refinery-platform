angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', '$rootScope','$filter','analysisService', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout, $rootScope, $filter, analysisService) {
  "use strict";
  var vm = this;
  vm.analysesList = [];
  vm.analysesGlobalList = [];
  vm.analysesDetail = {};
  vm.analysesGlobalDetail = {};
  vm.analysesRunningList = [];
  vm.analysesRunningGlobalList = [];
  vm.timerList = undefined;
  vm.timerGlobalList = undefined;
  vm.timerRunGlobalList = undefined;
  vm.timerRunList = undefined;
  vm.launchAnalysisFlag = false;
  vm.analysesRunningGlobalListCount = 0;
  vm.analysesLoadingFlag = "LOADING";
  vm.initializedFlag = {};

  vm.updateAnalysesList = function () {
    var param = {
      format: 'json',
      limit: 0,
      'data_set__uuid': dataSetUuid,
    };

    analysesFactory.getAnalysesList(param).then(function () {
      vm.analysesList = analysesFactory.analysesList;
      if(vm.analysesList.length === 0){
        vm.analysesLoadingFlag = "EMPTY";
      }else{
        vm.analysesLoadingFlag = "DONE";
      }
      vm.refreshAnalysesDetail();
    });

    vm.timerList =  $timeout(vm.updateAnalysesList, 30000);

    $scope.$on('refinery/analyze-tab-inactive', function(){
      $timeout.cancel(vm.timerList);
    });
  };

  vm.updateAnalysesGlobalList = function () {
    var params = {format:'json', limit: 10};

    analysesFactory.getAnalysesList(params).then(function () {
      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
      vm.refreshAnalysesGlobalDetail();
    });

   vm.timerGlobalList = $timeout(vm.updateAnalysesGlobalList, 30000);
  };

  vm.cancelTimerGlobalList = function(){
    if(typeof vm.timerGlobalList !== "undefined") {
      $timeout.cancel(vm.timerGlobalList);
    }
  };

  vm.updateAnalysesRunningList = function () {

    var params = {
      format: 'json',
      limit: 0,
      'data_set__uuid': dataSetUuid,
      'status': 'RUNNING'
    };

    analysesFactory.getAnalysesList(params).then(function () {
      vm.analysesRunningList = analysesFactory.analysesRunningList;
      vm.launchAnalysisFlag = false;
    });

    vm.timerRunList = $timeout(vm.updateAnalysesRunningList, 30000);

    if(typeof dataSetUuid === 'undefined' || dataSetUuid === "None"){
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.updateAnalysesRunningGlobalList = function () {

    var params = {
      format:'json', limit: 0, 'status': 'RUNNING'
    };

    analysesFactory.getAnalysesList(params).then(function () {
      vm.analysesRunningGlobalList = analysesFactory.analysesRunningGlobalList;
      vm.analysesRunningGlobalListCount = vm.analysesRunningGlobalList.length;
      vm.launchAnalysisFlag = false;
    });
    vm.timerRunGlobalList = $timeout(vm.updateAnalysesRunningGlobalList, 30000);

    if(typeof dataSetUuid === 'undefined' || dataSetUuid === "None"){
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.cancelTimerRunningList = function(){
    if(typeof vm.timerRunList !== "undefined") {
      $timeout.cancel(vm.timerRunList);
    }
  };

  vm.cancelTimerRunningGlobalList = function(){
    if(typeof vm.timerRunGlobalList !== "undefined") {
      $timeout.cancel(vm.timerRunGlobalList);
    }
  };

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

  vm.cancelAnalysis = function (uuid) {
    vm.setCancelAnalysisFlag(true, uuid);

    analysesFactory.postCancelAnalysis(uuid).then(function (result) {
      $timeout.cancel(vm.timerList);
      vm.updateAnalysesList().then(function() {
        bootbox.alert("Successfully canceled analysis.");
        vm.setCancelAnalysisFlag(false, uuid);
        $rootScope.$broadcast("rf/cancelAnalysis");
      });
    }, function (error) {
      $timeout.cancel(vm.timerList);
      vm.updateAnalysesList().then(function() {
        bootbox.alert("Canceling analysis failed");
        vm.setCancelAnalysisFlag(false, uuid);
      });
    });
  };

  vm.setCancelAnalysisFlag = function(logic,uuid){
    if(typeof vm.analysesDetail[uuid] !== 'undefined'){
      vm.analysesDetail[uuid].cancelingAnalyses = logic;
    }else{
      vm.initializedFlag[uuid] = logic;
    }
  };

  //Alert message which show on analysis view filtered page
  vm.setAnalysesAlertMsg = function () {
    var uuid = window.analysisUuid;
    analysesAlertService.setAnalysesMsg(uuid);
    vm.analysesMsg = analysesAlertService.getAnalysesMsg();
  };

  vm.isAnalysesRunning = function () {
    if (typeof vm.analysesRunningList !== 'undefined' && vm.analysesRunningList.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  vm.isAnalysesRunningGlobal = function () {
    if(typeof vm.analysesRunningGlobalList !== 'undefined' && vm.analysesRunningGlobalList.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  vm.isEmptyAnalysesGlobalList = function(){
    if(typeof vm.analysesRunningList !== 'undefined' && vm.analysesGlobalList.length > 0){
      return false;
    }else{
      return true;
    }
  };

  vm.isAnalysisDetailLoaded = function(uuid){
    if(typeof vm.analysesDetail[uuid] !== "undefined" && vm.analysesDetail[uuid].preprocessing !== ""){
      return true;
    }else{
      return false;
    }
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
