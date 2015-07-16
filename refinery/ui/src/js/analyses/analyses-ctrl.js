angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope','$timeout', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope, $timeout) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};

  vm.updateAnalysesList = function(){
    console.log("update List");
    analysesFactory.getAnalysesList().then(function(){
      vm.analysesList = analysesFactory.analysesList;
      vm.analysesRunningUuids = analysesFactory.createAnalysesRunningList(vm.analysesList);
    });
  };

  vm.refreshAnalysesDetail = function(){
    for(var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.updateAnalysesDetail(i);
    }
    if(vm.analysesRunningUuids.length > 0) {
      $timeout(vm.refreshAnalysesDetail, 5000);
      $timeout(vm.updateAnalysesList, 30000);

    }
  };

  vm.updateAnalysesDetail = function(i){
    (function(i){
      analysesFactory.getAnalysesDetail(vm.analysesRunningUuids[i]).then(function(response) {
          vm.analysesDetail[vm.analysesRunningUuids[i]] = analysesFactory.analysesDetail[vm.analysesRunningUuids[i]];
        console.log(vm.analysesDetail[vm.analysesRunningUuids[i]]);
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
