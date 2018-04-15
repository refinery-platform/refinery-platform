/**
 * Group Member Add Modal
 * @namespace groupMemberAddModal
 * @desc Edit a group membership modal
 * @memberOf refineryApp.groupMemberAddModal
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpGroupMemberAddModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/group-member-add-modal.html');
      }],
      bindings: {
        modalInstance: '<'
      },
      controller: 'GroupMemberAddModalCtrl'
    });
})();
