angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope) {
  "use strict";
  var vm = this;

  analysesFactory.getAnalysesList().then(function(){
    vm.analysesList = analysesFactory.analysesList;
  });

  vm.updateAnalysisDetail = function(uuid){
    analysesFactory.getAnalysisDetail(uuid).then(function(){
      vm.analysisDetail = analysesFactory.analysisDetail;
    }, function(error){
      console.error(error);
    });
  }

}
