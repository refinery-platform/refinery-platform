/**
 * Permission Editor Modal Ctrl
 * @namespace rpPermissionEditorModal
 * @desc Permission editor modal component shared by file browser and dashboard
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpPermissionEditorModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/permission-dialog.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'PermissionEditorCtrl as modal',
    });
})();
