/**
 * History Card Component
 * @namespace rpHistoryCard
 * @desc History component on dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpHistoryCard', {
      controller: 'HistoryCardCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/history-card.html');
      }]
    });
})();
