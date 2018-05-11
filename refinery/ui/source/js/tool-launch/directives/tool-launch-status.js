/**
 * Tool Launch Status Component
 * @namespace rpToolLaunchStatus
 * @desc Component which displays the status  messages
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolLaunchStatus', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-launch-status.html');
      }],
      controller: 'ToolLaunchStatusCtrl'
    });
})();
