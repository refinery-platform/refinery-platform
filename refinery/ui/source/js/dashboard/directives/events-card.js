/**
 * Events Card Component
 * @namespace rpEventsCard
 * @desc Event component on dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpEventsCard', {
      controller: 'EventsCardCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/events-card.html');
      }]
    });
})();
