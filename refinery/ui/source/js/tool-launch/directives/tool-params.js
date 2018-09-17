/**
 * Tool Params Component
 * @namespace rpToolParams
 * @desc Component for the parameter's panel.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('rpToolParams', {
      controller: 'ToolParamsCtrl',
      require: {
        displayCtrl: '^rpToolDisplay'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/tool-params.html');
      }]
    });
})();
