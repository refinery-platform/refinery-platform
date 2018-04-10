/**
 * Collaboration Card  Component
 * @namespace rpCollaborationCard
 * @desc Collboration component on  dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpCollaborationCard', {
      controller: 'CollaborationCardCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/collaboration-card.html');
      }]
    });
})();
