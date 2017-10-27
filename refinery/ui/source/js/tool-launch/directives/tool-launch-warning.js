/**
 * Tool Launch Warning Component
 * @namespace rpToolLaunchWarning
 * @desc Component which displays a warning message to users who aren't
 * allowed to launch Tools
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolLaunchWarning', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-launch-warning.html');
      }],
      controller: 'ToolLaunchButtonCtrl'
    });
})();
