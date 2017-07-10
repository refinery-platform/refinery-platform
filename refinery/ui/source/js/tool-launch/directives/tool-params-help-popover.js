/**
 * Tool Params Help Popover
 * @namespace rpToolParamsHelpPopover
 * @desc Component for the tool parameter's help popover
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular.module('refineryToolLaunch')
    .component('rpToolParamsHelpPopover', {
      bindings: {
        toolParam: '<'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-params-help-popover.html');
      }]
    });
})();
