/**
 * Primary Group Button Component
 * @namespace rpPrimaryGroupButton
 * @desc Primary Group button component on dashboard.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';
  angular
    .module('refineryDashboard')
    .component('rpPrimaryGroupButton', {
      controller: 'PrimaryGroupButtonCtrl',
      require: {
        filterCtrl: '^rpDataSetsCard'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/dashboard/partials/primary-group-button.html');
      }]
    });
})();
