'use strict';

function isaTabImportDirective ($window) {
  return {
    bindToController: {
      importOption: '='
    },
    controller: 'IsaTabImportCtrl',
    controllerAs: 'isaTabImport',
    restrict: 'E',
    replace: true,
    templateUrl: function () {
      return $window.getStaticUrl('partials/data-set-import/partials/isa-tab-import.html');
    }
  };
}

angular
  .module('refineryDataSetImport')
  .directive('isaTabImport', [
    '$window',
    isaTabImportDirective
  ]);
