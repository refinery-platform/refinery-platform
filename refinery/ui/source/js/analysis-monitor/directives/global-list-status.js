/**
 * Analysis Monitor Global List Status
 * @namespace rpAnalysisMonitorGlobalListStatus
 * @desc Component for the analysis global status icon
 * @memberOf refineryApp.refineryAnalysisMonitor
 */
(function () {
  'use strict';

  angular.module('refineryAnalysisMonitor')
    .component('rpAnalysisMonitorGlobalListStatus', {
      controller: 'AnalysisMonitorGlobalListStatusCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl(
          'partials/analysis-monitor/partials/global-list-status.html'
        );
      }]
    });
})();
