/**
 * Tool Display Component
 * @namespace rpToolDisplay
 * @desc Main parent component for the main view, tool display. View consist
 * of the entire tool launch panel.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolDisplay', {
      controller: 'ToolDisplayCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/views/tool-display.html');
      }]
    });
})();
