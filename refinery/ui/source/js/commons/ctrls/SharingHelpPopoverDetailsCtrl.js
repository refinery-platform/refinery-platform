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

   /*
   * ---------------------------------------------------------
   * LifeCycle Hooks
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      vm.isCollaborationPage = $location.search('collaboration').$$search.collaboration;
      console.log(vm.isCollaborationPage);
    };
  }
})();
