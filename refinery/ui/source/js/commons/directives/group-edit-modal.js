/**
 * Group Edit Modal
 * @namespace groupEditModal
 * @desc Edit a group membership modal
 * @memberOf refineryApp.aPIResponseModal
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpGroupEditModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/group-edit-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'GroupEditModalCtrl'
    });
})();
