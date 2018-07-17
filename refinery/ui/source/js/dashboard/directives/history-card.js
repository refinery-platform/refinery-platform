/**
 * History Card Component
 * @namespace rpHistoryCard
 * @desc History card component on dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpHistoryCard', {
      controller: 'HistoryCardCtrl',
      require: {
        ParentCtrl: '^rpDashboard'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/history-card.html');
      }]
    });
})();
