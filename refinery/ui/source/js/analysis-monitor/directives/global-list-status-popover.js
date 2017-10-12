(function () {
  'use strict';

  angular.module('refineryAnalysisMonitor')
    .component('rpAnalysisMonitorGlobalListStatusPopover', {
      controller: 'AnalysisMonitorGlobalPopoverCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/analysis-monitor/partials/global-list-status-popover.html'
        );
      }]
    });
})();
