/**
 * Collaboration Card  Component
 * @namespace rpCollaborationCard
 * @desc Child collboration component of dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpCollaborationCard', {
      controller: 'CollaborationCardCtrl',
      require: {
        dashboardParentCtrl: '^rpDashboard'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/collaboration-card.html');
      }]
    });
})();
