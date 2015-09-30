angular.module('refineryAnalysisMonitor')
    .directive("analysisMonitorAnalysesList",
  [
    '$rootScope',
    analysisMonitorAnalysesList
  ]
);

function analysisMonitorAnalysesList() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/analysis-monitor/partials/analyses-list.html',
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
       analysesList: '@',
       analysesDetail: '@'
    },
    link: function(scope, element, attr){

      scope.$on('refinery/analyze-tab-active', function () {
        scope.AMCtrl.updateAnalysesList();
      });

      scope.isCollapsed = false;

      //Analyses view sorting
      scope.predicate = 'time_start';
      scope.reverse = true;
      scope.analysisIcon = "icon-arrow-up";
      scope.order = function(predicate) {
        scope.reverse = (scope.predicate === predicate) ? !scope.reverse : false;
        scope.predicate = predicate;
        if(scope.reverse === true) {
          scope.analysisIcon = "icon-arrow-up";
        }else{
          scope.analysisIcon = "icon-arrow-down";
        }
      };

      //Analyses view pagination
      scope.itemsPerPage = 20;
      scope.currentPage = 0;

      scope.prevPage = function() {
        if (scope.currentPage > 0) {
          scope.currentPage--;
        }
      };

      scope.prevPageDisabled = function() {
        return scope.currentPage === 0 ? "disabled" : "";
      };

      scope.nextPage = function() {
        if (scope.currentPage < scope.pageCount()) {
          scope.currentPage++;
        }
      };

      scope.nextPageDisabled = function() {
        if(scope.currentPage === scope.pageCount()) {
          return "disabled";
        }else{
          return "";
        }
      };

      scope.pageCount = function() {
        var totalPages = Math.ceil(
          scope.AnalysisMonitorCtrl.analysesList.length/scope.itemsPerPage
        );

        return totalPages;
      };

      scope.range = function(){
        var tempNum = scope.pageCount();
        var rangeArr = [];

        for(var i = 0; i < tempNum; i++){
          rangeArr.push(i);
        }
        return rangeArr;
      };

      scope.setPage = function(n){
          scope.currentPage = n;
      };

    }
  };
}
