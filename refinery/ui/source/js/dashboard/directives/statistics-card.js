/**
 * Data Sets Statistics Ctrl Component
 * @namespace rpStatisticsCard
 * @desc Child component of dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpStatisticsCard', {
      controller: 'StatisticsCardCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/statistics-card.html');
      }]
    });
})();
