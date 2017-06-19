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
