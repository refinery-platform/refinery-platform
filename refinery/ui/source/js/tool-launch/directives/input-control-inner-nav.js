/**
 * Input Control Inner Nav Component
 * @namespace rpInputControlInnerNav
 * @desc Component for the input files panel. Child component of the
 * display component.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpInputControlInnerNav', {
      controller: 'InputControlInnerNavCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-control-inner-nav.html');
      }]
    });
})();
