/**
 * Sharing Help Popover Details
 * @namespace rpSharingHelpPopoverDetails
 * @desc Common popover component template used between the collaboration
 * page and sharing/edit page
 * @memberOf refineryApp
 */
(function () {
  angular
    .module('refineryApp')
    .component('rpSharingHelpPopoverDetails', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/sharing-help-popover-details.html');
      }],
      controller: 'SharingHelpPopoverDetailsCtrl'
    });
})();
