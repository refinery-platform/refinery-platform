(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpSharingHelpPopover', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/sharing-help-popover.html');
      }]
    });
})();
