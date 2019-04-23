/**
 * rpIsaTabImport
 * @namespace rpIsaTabImport
 * @desc Component for the isatab data set import tab
 * @memberOf refineryApp.refineryDataSetImport
 */
(function () {
  'use strict';
  angular
    .module('refineryDataSetImport')
    .component('rpIsaTabImport', {
      bindToController: {
        importOption: '='
      },
      controller: 'IsaTabImportCtrl',
      restrict: 'E',
      replace: true,
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/data-set-import/partials/isa-tab-import.html');
      }]
    });
})();
