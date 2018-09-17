'use strict';

function analysisMonitorAnalysesList ($location, $window) {
  return {
    restrict: 'E',
    templateUrl: function () {
      return $window.getStaticUrl('partials/analysis-monitor/partials/analyses-list.html');
    },
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    bindToController: {
      analysesDetail: '@'
    },
    link: function (scope) {
      scope.stageTooltipInfo = {
        refineryImport: 'Downloading analysis input files into Refinery',
        galaxyImport: 'Uploading analysis input files into Galaxy',
        galaxyAnalysis: 'Running analysis in Galaxy',
        galaxyExport: 'Downloading analysis results from Galaxy'
      };

      if ($location.absUrl().indexOf('data_sets') > -1) {
        scope.AMCtrl.updateAnalysesList();
      } else {
        scope.$on('refinery/analyze-tab-active', function () {
          scope.AMCtrl.updateAnalysesList();
        });
      }

      scope.isCollapsed = false;

      // Analyses view sorting
      scope.predicate = 'time_start';
      scope.reverse = true;
      scope.analysisIcon = 'fa fa-arrow-up';
      scope.order = function (predicate) {
        scope.reverse = (scope.predicate === predicate) ? !scope.reverse : false;
        scope.predicate = predicate;
        if (scope.reverse === true) {
          scope.analysisIcon = 'fa fa-arrow-up';
        } else {
          scope.analysisIcon = 'fa fa-arrow-down';
        }
      };

      // Analyses view pagination
      scope.itemsPerPage = 20;
      scope.currentPage = 0;

      scope.prevPage = function () {
        if (scope.currentPage > 0) {
          scope.currentPage--;
        }
      };

      scope.prevPageDisabled = function () {
        return scope.currentPage === 0 ? 'disabled' : '';
      };

      scope.nextPage = function () {
        if (scope.currentPage < scope.pageCount()) {
          scope.currentPage++;
        }
      };

      scope.nextPageDisabled = function () {
        if (scope.currentPage === scope.pageCount()) {
          return 'disabled';
        }
        return '';
      };

      scope.pageCount = function () {
        var totalPages = Math.ceil(
          scope.AMCtrl.analysesList.length / scope.itemsPerPage
        );

        return totalPages;
      };

      scope.range = function () {
        var tempNum = scope.pageCount();
        var rangeArr = [];

        for (var i = 0; i < tempNum; i++) {
          rangeArr.push(i);
        }
        return rangeArr;
      };

      scope.setPage = function (n) {
        scope.currentPage = n;
      };
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('analysisMonitorAnalysesList', [
    '$location',
    '$window',
    analysisMonitorAnalysesList
  ]);
