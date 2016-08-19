'use strict';

function isaTabImportDirective () {
  return {
    bindToController: {
      importOption: '='
    },
    controller: 'IsaTabImportCtrl',
    controllerAs: 'isaTabImport',
    restrict: 'E',
    replace: true,
    templateUrl:
      '/static/partials/data-set-import/partials/isa-tab-import.html'
  };
}

angular
  .module('refineryDataSetImport')
  .directive('isaTabImport', [
    isaTabImportDirective
  ]);
