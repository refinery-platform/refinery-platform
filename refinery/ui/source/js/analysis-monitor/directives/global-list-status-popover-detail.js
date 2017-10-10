'use strict';

function rpAnalysisMonitorGlobalListStatusPopoverDetails ($window) {
  return {
    restrict: 'E',
    scope: {
      analysesGlobalList: '@',
      analysesGlobalLoadingFlag: '@',
      analysesGlobalDetail: '@',
      isAnalysesRunningGlobal: '&'
    },
    require: '^^rpAnalysisMonitorGlobalListStatusPopover',
    templateUrl:
      $window.getStaticUrl('partials/analysis-monitor/partials/global-list-status-popover.html'),
    link: function (scope, element, attr, $ctrl) {
      scope.$watchCollection(
        function () {
          return $ctrl.analysesGlobalList;
        },
        function () {
          scope.analysesGlobalList = $ctrl.analysesGlobalList;
          scope.analysesGlobalDetail = $ctrl.analysesGlobalDetail;
        }
      );

      scope.$watch(
        function () {
          return $ctrl.analysesGlobalLoadingFlag;
        },
        function () {
          scope.analysesGlobalLoadingFlag = $ctrl.analysesGlobalLoadingFlag;
          scope.isAnalysesRunningGlobal = $ctrl.isAnalysesRunningGlobal;
          scope.analysesGlobalList = $ctrl.analysesGlobalList;
          scope.analysesGlobalDetail = $ctrl.analysesGlobalDetail;
        }
      );
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusPopoverDetails', [
    '$window',
    rpAnalysisMonitorGlobalListStatusPopoverDetails
  ]);
