angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope','$timeout', '$rootScope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope, $timeout) {
  "use strict";
  var vm = this;
  vm.analysesDetail = {};

  vm.updateAnalysesList = function(){
    analysesFactory.getAnalysesList().then(function(){
      vm.analysesList = analysesFactory.analysesList;
      vm.analysesRunningUuids = analysesFactory.createAnalysesRunningList(vm.analysesList);
    });

    var timerList = $timeout(vm.updateAnalysesList, 30000);
      $scope.$on('refinery/analyze-tab-inactive', function(){
        $timeout.cancel(timerList);
      });
  };

  vm.refreshAnalysesDetail = function(){
    var timerDetail;

    for(var i = 0; i < vm.analysesRunningUuids.length; i++) {
      vm.updateAnalysesDetail(i);
    }
    if(vm.analysesRunningUuids.length > 0) {
      timerDetail = $timeout(vm.refreshAnalysesDetail, 5000);
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
      alert( "Successfully canceled analysis." );
      vm.analysesDetail[uuid].cancelingAnalyses = true;
      vm.updateAnalysesList();
    }, function(error){
      alert("Canceling analysis failed");
      vm.analysesDetail[uuid].cancelingAnalyses = true;
    });
  };

  //watches for analyze tab view to update AnalysesList
  $scope.$on('refinery/analyze-tab-active', function(){
    vm.updateAnalysesList();
  });

}
