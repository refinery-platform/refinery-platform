/**
 * Permission Editor Modal Ctrl
 * @namespace rpPermissionEditorModal
 * @desc Common modal component used on dashboard and file browser, per data set
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
