/**
 * Group Member Add Modal
 * @namespace groupMemberAddModal
 * @desc Invite a user to join a group component (modal)
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
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'GroupMemberAddModalCtrl'
    });
})();
