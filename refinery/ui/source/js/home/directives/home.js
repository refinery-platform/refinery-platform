/**
 * Home Component
 * @namespace rpHome
 * @desc Main parent component for the main view
 * @memberOf refineryApp.refineryHome
 */
(function () {
  'use strict';
  angular
    .module('refineryHome')
    .component('rpHome', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/home/views/home.html');
      }]
    });
})();
