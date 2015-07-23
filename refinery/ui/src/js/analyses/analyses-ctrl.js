angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', '$rootScope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout, $rootScope) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};
  vm.analysesRunningUuids = [];
  vm.analysesList = [];
  vm.analysesGlobalList = [];
  vm.analysesRunningGlobalUuids = [];
  vm.analysesGlobalDetail = {};
  vm.analysesRunningList = [];
  //vm.allAnalysesRunningUuids = [];

  vm.updateAnalysesList = function () {
    analysesFactory.getAnalysesList().then(function () {
      vm.analysesList = analysesFactory.analysesList;
   //   vm.analysesRunningUuids =
   // analysesFactory.createAnalysesRunningList(vm.analysesList);
      vm.refreshAnalysesDetail();
    });

     var timerList =  $timeout(vm.updateAnalysesList, 30000);

     $scope.$on('refinery/analyze-tab-inactive', function(){
      $timeout.cancel(timerList);
    });
  };

  $scope.updateAnalysesGlobalList = function (timerStatus) {
    timerStatus = timerStatus || "";
 console.log("getAnalysesGlobalList");
    analysesFactory.getAnalysesGlobalList().then(function () {

      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
    //  vm.analysesGlobalListTen =
    // analysesFactory.analysesGlobalList.slice(0,10);
    //  vm.analysesRunningGlobalUuids = analysesFactory.createAnalysesRunningList(vm.analysesGlobalList);
   //   vm.filterGlobalList( vm.analysesGlobalList);
      vm.refreshAnalysesGlobalDetail();
    });
    var timerGlobalList = $timeout($scope.updateAnalysesGlobalList, 10000);

    if(timerStatus === "once"){
      console.log("Stop the analysesGlobalList");
      $timeout.cancel(timerGlobalList);
    }
  };

  vm.updateAnalysesRunningGlobalList = function () {
    analysesFactory.getAnalysesRunningGlobalList().then(function () {
      vm.analysesGlobalRunningList = analysesFactory.analysesGlobalRunningList;
    //  vm.analysesGlobalListTen =
    // analysesFactory.analysesGlobalList.slice(0,10);
    //  vm.analysesRunningGlobalUuids = analysesFactory.createAnalysesRunningList(vm.analysesGlobalList);
   //   vm.filterGlobalList( vm.analysesGlobalList);
   //   vm.refreshAnalysesGlobalDetail();
    });
    $timeout(vm.updateAnalysesRunningGlobalList, 10000);
  };

  vm.updateAnalysesRunningList = function () {
    analysesFactory.getAnalysesRunningList().then(function () {
      vm.analysesRunningList = analysesFactory.analysesRunningList;
    //  vm.analysesGlobalListTen =
    // analysesFactory.analysesGlobalList.slice(0,10);
    //  vm.analysesRunningGlobalUuids = analysesFactory.createAnalysesRunningList(vm.analysesGlobalList);
   //   vm.filterGlobalList( vm.analysesGlobalList);
   //   vm.refreshAnalysesDetail();
    });
    $timeout(vm.updateAnalysesRunningList, 5000);
  };

  //vm.filterGlobalList = function(){
  //   console.log("in FILTER analyses global list");
  //  if(!(typeof dataSetUuid === 'undefined' || dataSetUuid === "None")) {
  //    var tempArr = [];
  //    for (var i = 0; i < vm.analysesGlobalList.length; i++) {
  //      if (dataSetUuid === vm.analysesGlobalList[i].data_set__uuid) {
  //        tempArr.push(vm.analysesGlobalList[i]);
  //      }
  //    }
  //    vm.analysesList = tempArr;
  //    vm.analysesRunningUuids = analysesFactory.createAnalysesRunningList(vm.analysesList);
  //  }
  //};

  vm.refreshAnalysesGlobalDetail = function(){
     console.log("in refresh analyses global detail");
    var timerDetail;
    for (var i = 0; i < vm.analysesRunningGlobalUuids.length; i++) {
      vm.updateAnalysesGlobalDetail(i);
    }
    //if (vm.analysesRunningGlobalUuids > 0) {
    //timerDetail = $timeout(vm.refreshAnalysesGlobalDetail, 10000);
    //}
    //else {
    //  $timeout.cancel(timerDetail);
    //}
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
    if (vm.analysesRunningGlobalUuids.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  //watches for analyze tab view to update AnalysesList
  $scope.$on('refinery/analyze-tab-active', function () {
  //  vm.refreshAnalysesGlobalDetail();
    vm.updateAnalysesList();
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

  if(!(typeof dataSetUuid === 'undefined' || dataSetUuid === "None")) {
    vm.updateAnalysesRunningList();
  }
 // vm.updateAnalysesRunningGlobalList();
//  vm.updateAnalysesGlobalList();
}
