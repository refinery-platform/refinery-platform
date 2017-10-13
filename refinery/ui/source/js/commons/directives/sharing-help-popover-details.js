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
