'use strict';

function metadataTableDirective () {
  return {
    bindToController: {
      importOption: '='
    },
    controller: 'MetadataTableImportCtrl',
    controllerAs: 'metadataTable',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/data-set-import/directives/metadata-table.html'
  };
}

angular
  .module('refineryDataSetImport')
  .directive('metadataTable', [
    metadataTableDirective
  ]);
