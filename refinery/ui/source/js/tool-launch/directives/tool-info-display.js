/**
 * Tool Info Display Component
 * @namespace rpToolInfoDisplay
 * @desc Child component of the main view, tool display. View
 * consist of the tool info panel.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolInfoDisplay', {
      controller: 'ToolInfoDisplayCtrl',
      require: {
        displayCtrl: '^rpToolDisplay'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-info-display.html');
      }]
    });
})();
