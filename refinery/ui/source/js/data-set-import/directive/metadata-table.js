'use strict';

function metadataTableDirective () {
  return {
    bindToController: {
      graphData: '=graph',
      valuePropertyName: '=valuePropertyName'
    },
    controller: 'MetadataTableImportCtrl',
    controllerAs: 'metadataTable',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/data-set-import/directives/metadata-table.html'
  };
}

angular
  .module('listGraph')
  .directive('listGraph', [
    metadataTableDirective
  ]);
