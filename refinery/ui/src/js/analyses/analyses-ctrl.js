angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope','$timeout', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope, $timeout) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};

  analysesFactory.getAnalysesList().then(function(){
    vm.analysesList = analysesFactory.analysesList;
    vm.analysesRunningUuids = vm.createAnalysesRunningList(vm.analysesList);
  });

  vm.updateAnalysesDetail = function(){
    for(var i = 0; i < vm.analysesRunningUuids.length; i++) {
      console.log(i);
      (function(i){
        analysesFactory.getAnalysisDetail(vm.analysesRunningUuids[i]).then(function(response) {
            vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysisDetail;
        }, function(error) {
          console.error(error);
        });
      })(i);
    }

    if(vm.analysesRunningUuids.length > 0) {
      console.log("in the update place");
      $timeout(vm.updateAnalysesDetail, 10000);
    }
  };

  vm.createAnalysesRunningList = function(data){
    var tempArr = [];
    for(var i = 0; i<data.length; i++){
      if(data[i].status === "RUNNING"){
        tempArr.push(data[i].uuid);
      }
    }
    return tempArr;
  };

  vm.startAnalysisDetail = function(uuid){
    if(Object.keys(vm.analysesDetail).length === 0){
      vm.updateAnalysesDetail();
    }
  };
}
