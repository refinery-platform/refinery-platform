/**
 * Analysis Monitor Global Status Popover
 * @namespace rpAnalysisMonitorGlobalStatusPopover
 * @desc Component for the analysis global status icon popover details
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular.module('refineryAnalysisMonitor')
    .component('rpAnalysisMonitorGlobalStatusPopover', {
      controller: 'AnalysisMonitorGlobalStatusPopoverCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/analysis-monitor/partials/global-status-popover.html'
        );
      }]
    });
})();
