/**
 * Tool Launch Name Component
 * @namespace rpToolLaunchName
 * @desc Component for a form to add display name for tool
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolLaunchName', {
      controller: 'ToolLaunchNameCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-launch-name.html');
      }]
    });
})();
