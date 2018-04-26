/**
 * Data Sets Card Ctrl Component
 * @namespace rpDataSetsCard
 * @desc Child component for the data sets card, dashboard. View consist
 * of the entire dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpDataSetsCard', {
      controller: 'DataSetsCardCtrl',
      require: {
        dashboardParentCtrl: '^rpDashboard'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/data-sets-card.html');
      }]
    });
})();
