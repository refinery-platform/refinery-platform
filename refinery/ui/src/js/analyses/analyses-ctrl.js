angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory', 'analysesAlertService','$scope','$timeout', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, analysesAlertService, $scope, $timeout) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};
  vm.analysesRunningUuids = [];
  vm.analysesGlobalList = [];

  vm.updateAnalysesList = function(){
    analysesFactory.getAnalysesList().then(function(){
      vm.analysesList = analysesFactory.analysesList;
      vm.analysesRunningUuids = analysesFactory.createAnalysesRunningList(vm.analysesList);
    });

    $timeout(vm.updateAnalysesList, 20000);
  };

  vm.updateAnalysesGlobalList = function(){
    analysesFactory.getAnalysesGlobalList().then(function(){
      vm.analysesGlobalList = analysesFactory.analysesGlobalList;
      console.log(vm.analysesGlobalList);
    });

    $timeout(vm.updateAnalysesGlobalList, 20000);
  };

  vm.refreshAnalysesDetail = function(){
    var timerDetail;
    for(var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.updateAnalysesDetail(i);
    }
    if(vm.analysesRunningUuids.length > 0){
      timerDetail = $timeout(vm.refreshAnalysesDetail, 10000);
    }else{
      $timeout.cancel(timerDetail);
    }

    $scope.$on('refinery/analyze-tab-inactive', function(){
      $timeout.cancel(timerDetail);
    });
  };

  vm.updateAnalysesDetail = function(i){
    (function(i){
      analysesFactory.getAnalysesDetail(vm.analysesRunningUuids[i]).then(function(response) {
          vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysesDetail[vm.analysesRunningUuids[i]];
      });
    })(i);
  };

  vm.cancelAnalysis = function(uuid){
    vm.analysesDetail[uuid].cancelingAnalyses = true;
    analysesFactory.postCancelAnalysis(uuid).then(function(result)
    {
      bootbox.alert( "Successfully canceled analysis." );
      vm.analysesDetail[uuid].cancelingAnalyses = false;
      //vm.updateAnalysesList();
    }, function(error){
      bootbox.alert("Canceling analysis failed");
      vm.analysesDetail[uuid].cancelingAnalyses = false;
    });
  };

  vm.setAnalysesAlertMsg= function(){
    var uuid = window.analysisUuid;
    analysesAlertService.setAnalysesMsg(uuid);
    vm.analysesMsg = analysesAlertService.getAnalysesMsg();
  };

  vm.isAnalysesRunning = function(){
    if(vm.analysesRunningUuids.length > 0){
      return true;
    }else{
      return false;
    }
  };

  //watches for analyze tab view to update AnalysesList
  $scope.$on('refinery/analyze-tab-active', function(){
    vm.refreshAnalysesDetail();
  });

  //checks url to see if view is filtered by analysis
  $scope.checkAnalysesViewFlag = function() {
    var flag;
    if(typeof window.analysisUuid === 'undefined' || window.analysisUuid === "None") {
      flag = false;
    }else{
      flag = true;
      vm.setAnalysesAlertMsg();
    }
    return flag;
  };


  //vm.updateAnalysesList();
  vm.updateAnalysesGlobalList();
}
