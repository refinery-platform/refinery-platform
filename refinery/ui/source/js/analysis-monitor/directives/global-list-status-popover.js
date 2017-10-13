/**
 * Analysis Monitor Global List Status Popover
 * @namespace rpAnalysisMonitorGlobalListStatusPopover
 * @desc Component for the analysis global status icon popover details
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
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
