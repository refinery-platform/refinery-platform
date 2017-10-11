(function () {
  'use strict';

  angular.module('refineryAnalysisMonitor')
    .component('rpAnalysisMonitorGlobalListStatusPopoverDetails', {
      controller: 'AnalysisMonitorPopoverCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/analysis-monitor/partials/global-list-status-popover.html'
        );
      }]
    });
})();
