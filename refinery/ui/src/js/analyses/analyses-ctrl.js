angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope','$timeout', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope, $timeout) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};

  vm.updateAnalysesList = function(){
    analysesFactory.getAnalysesList().then(function(){
      vm.analysesList = analysesFactory.analysesList;
      vm.analysesRunningUuids = vm.createAnalysesRunningList(vm.analysesList);
    });
  };

  vm.createAnalysesRunningList = function(data){
    var tempArr = [];
    for(var i = 0; i<data.length; i++){
      if(data[i].status === "RUNNING" || data[i].status === "INITIALIZED"){
        tempArr.push(data[i].uuid);
      }
    }
    return tempArr;
  };

  vm.refreshAnalysesDetail = function(){
    for(var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.updateAnalysesDetail(i);
    }
    if(vm.analysesRunningUuids.length > 0) {
      $timeout(vm.refreshAnalysesDetail, 10000);
    }
  };

  vm.updateAnalysesDetail = function(i){
    (function(i){
      analysesFactory.getAnalysesDetail(vm.analysesRunningUuids[i]).then(function(response) {
          vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysesDetail;
      });
    })(i);
  };

  vm.cancelAnalysis = function(uuid){
    analysesFactory.postCancelAnalysis(uuid).then(function(result)
    {
      alert( "Successfully canceled analysis." );
      vm.updateAnalysesList();
    }, function(error){
      alert("Canceling analysis failed");
    });
  };

  //watches for a successful analysis launch to update AnalysesList
  $scope.$on('AnalysisLaunchNew', function(event) {
    vm.updateAnalysesList();
  });

  vm.updateAnalysesList();
}
