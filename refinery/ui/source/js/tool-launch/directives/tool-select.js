/**
 * Tool Select Component
 * @namespace rpToolSelect
 * @desc Component which displays and allows selection of tools from
 * tools_definition API
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolSelect', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-select.html');
      }],
      controller: 'ToolSelectCtrl'
    });
})();
