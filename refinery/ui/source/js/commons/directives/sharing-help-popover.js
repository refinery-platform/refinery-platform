/**
 * Sharing Help Popover Ctrl
 * @namespace rpSharingHelpPopover
 * @desc Common popover component used between the collaboration page and
 * sharing/edit page
 * @memberOf refineryApp
 */
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
