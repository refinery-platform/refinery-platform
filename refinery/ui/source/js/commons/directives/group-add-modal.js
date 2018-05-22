/**
 * Group Add Modal
 * @namespace groupAddModal
 * @desc Add a group modal
 * @memberOf refineryApp.groupAddModal
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpGroupAddModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/group-add-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'GroupAddModalCtrl'
    });
})();
