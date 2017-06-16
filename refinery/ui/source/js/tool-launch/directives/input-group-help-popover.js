(function () {
  'use strict';

  angular.module('refineryToolLaunch')
    .component('rpInputGroupHelpPopover', {
      bindings: {
        displayFile: '<',
        displayFileColor: '<'
      },
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group-help-popover.html');
      }]
    });
})();
