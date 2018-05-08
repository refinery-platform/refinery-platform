/**
 * Dashboard Component
 * @namespace rpDashboard
 * @desc Main parent component for the main view, dashboard. View consist
 * of the entire dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpDashboard', {
      controller: 'DashboardMainCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/views/dashboard.html');
      }]
    });
})();
