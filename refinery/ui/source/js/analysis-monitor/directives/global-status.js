/**
 * Analysis Monitor Global Status
 * @namespace rpAnalysisMonitorGlobalStatus
 * @desc Component for the analysis global status icon
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular.module('refineryAnalysisMonitor')
    .component('rpAnalysisMonitorGlobalStatus', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/analysis-monitor/partials/global-status.html'
        );
      }]
    });
})();
