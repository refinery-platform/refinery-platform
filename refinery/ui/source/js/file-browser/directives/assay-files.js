angular.module('refineryFileBrowser')
    .directive("rpFileBrowserAssayFiles",
  [
    'uiGridConstants',
    'fileBrowserFactory',
    rpFileBrowserAssayFiles
  ]
);

function rpFileBrowserAssayFiles(uiGridConstants,fileBrowserFactory) {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-files.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
       assayFiles: '@',
       assayAttributes: '@'
    },
    link: function(scope){

      scope.FBCtrl.updateAssayFiles().then(function(){
        createColumnDefs();
        scope.gridOptions = {
        columnDefs: customColumnName,
        data: scope.FBCtrl.assayFiles
        };

        scope.checkUrlQueryFilters();
      });

      scope.gridOptions = {
        useExternalSorting: true,
        enableRowSelection: true,
        enableSelectAll: true,
        selectionRowHeaderWidth: 35,
        rowHeight: 35,
        showGridFooter:true,
        enableSelectionBatchEvent: true
      };

      scope.info = {};
      scope.gridOptions.multiSelect = true;

      var customColumnName = [];
      var createColumnDefs = function(){
        scope.FBCtrl.assayAttributes.forEach(function(attribute){
          customColumnName.push(
            {
              name: attribute.display_name,
              field: attribute.internal_name
            }
          );
        });
      };

      scope.gridOptions.onRegisterApi = function(gridApi) {
        //set gridApi on scope

        scope.gridApi = gridApi;

        //Sort events
        scope.gridApi.core.on.sortChanged( scope, scope.sortChanged );
        scope.sortChanged(scope.gridApi.grid, [ scope.gridOptions.columnDefs[1] ] );

        //Checkbox selection events
        scope.gridApi.selection.on.rowSelectionChanged(scope, function (row) {
           scope.selectNodes = gridApi.selection.getSelectedRows();
        });

        scope.gridApi.selection.on.rowSelectionChangedBatch(scope, function (rows) {
          scope.selectNodes = gridApi.selection.getSelectedRows();
        });
      };

      scope.sortChanged = function ( grid, sortColumns ) {
        if (typeof sortColumns !== 'undefined' && typeof sortColumns[0] !== 'undefined') {
          switch (sortColumns[0].sort.direction) {
            case uiGridConstants.ASC:
              scope.filesParam['sort'] = sortColumns[0].field + ' asc';
              scope.FBCtrl.updateAssayFiles()
                .then(function(){
                  scope.gridOptions.data = scope.FBCtrl.assayFiles;
              });
              break;
            case uiGridConstants.DESC:
              scope.filesParam['sort'] = sortColumns[0].field + ' desc';
              scope.FBCtrl.updateAssayFiles()
                .then(function(){
                  scope.gridOptions.data = scope.FBCtrl.assayFiles;
              });
              break;
            case undefined:
              scope.FBCtrl.updateAssayFiles()
                .then(function(){
                  scope.gridOptions.data = scope.FBCtrl.assayFiles;
              });
              break;
          }
        }
      };
    }
  };
}
