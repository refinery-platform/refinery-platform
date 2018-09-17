/**
 * Tool Launch Button Component
 * @namespace rpToolLaunchButton
 * @desc Component for a button which launches a tool
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolLaunchButton', {
      controller: 'ToolLaunchButtonCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-launch-button.html');
      }]
    });
})();
