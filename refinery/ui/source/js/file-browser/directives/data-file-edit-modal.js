/**
 * Group Add Modal
 * @namespace rpDataFileEditModal
 * @desc Add or remove a data file associated with a node
 * @memberOf refineryApp.fileBrowser
 */
(function () {
  'use strict';
  angular
    .module('refineryFileBrowser')
    .component('rpDataFileEditModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/group-add-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'DataFileEditModalCtrl'
    });
})();
