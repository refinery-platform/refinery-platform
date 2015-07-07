angular.module('refineryAnalyses')
    .controller('AnalysesCtrl',
    ['analysesFactory','$scope', AnalysesCtrl]);


function AnalysesCtrl(analysesFactory, $scope) {
  "use strict";
  var vm = this;

  analysesFactory.getAnalysesList().then(function(){
    vm.analysesList = analysesFactory.analysesList;
  });

}
