(function () {
  'use strict';

  angular.module('refineryToolLaunch')
    .component('rpInputGroupHelpPopover', {
      controller: 'InputGroupHelpPopoverCtrl',
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/input-group-help-popover.html');
      }]
    });
})();
