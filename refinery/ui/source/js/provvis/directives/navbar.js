/**
 * Provvis Navbar Directive
 * @namespace provvisNavBar
 * @desc Navbar directive for the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';

  angular
    .module('refineryProvvis')
    .directive('provvisNavBar', provvisNavBar);

  provvisNavBar.$inject = ['$window'];

  function provvisNavBar ($window) {
    return {
      restrict: 'AE',
      templateUrl: function () {
        return $window.getStaticUrl('partials/provvis/partials/provvis-navbar.html');
      }
    };
  }
})();
