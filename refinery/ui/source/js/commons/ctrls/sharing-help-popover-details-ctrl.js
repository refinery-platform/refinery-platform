/**
 * Sharing Help Popover Details Ctrl
 * @namespace SharingHelpPopoverDetailsCtrl
 * @desc Controller for the sharing help popover details
 * @memberOf refineryApp
 */
(function () {
  'use strict';

  angular
    .module('refineryApp')
    .controller('SharingHelpPopoverDetailsCtrl', SharingHelpPopoverDetailsCtrl);

  SharingHelpPopoverDetailsCtrl.$inject = [
    '$location'
  ];


  function SharingHelpPopoverDetailsCtrl (
    $location
  ) {
    var vm = this;
    vm.isCollaborationPage = false;

   /*
   * ---------------------------------------------------------
   * LifeCycle Hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      // check if the user is on the collaboration page
      vm.isCollaborationPage = $location.absUrl().indexOf('/collaboration/') > -1;
    };
  }
})();
