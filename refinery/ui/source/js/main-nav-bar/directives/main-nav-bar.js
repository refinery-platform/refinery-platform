/**
 * Main Nav Bar Component
 * @namespace rpMainNavBar
 * @desc Main navbar component for the base template
 * @memberOf refineryApp.refineryMainNavBar
 */
(function () {
  'use strict';
  angular
    .module('refineryMainNavBar')
    .component('rpMainNavBar', {
      controller: 'MainNavBarCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/main-nav-bar/partials/main-nav-bar.html');
      }]
    });
})();
