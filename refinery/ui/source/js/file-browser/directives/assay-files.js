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
      });

      scope.gridOptions = {
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
        scope.gridApi.selection.on.rowSelectionChanged(scope, function (row) {
           scope.selectNodes = gridApi.selection.getSelectedRows();
          console.log(scope.selectNodes);
        });

        scope.gridApi.selection.on.rowSelectionChangedBatch(scope, function (rows) {
          scope.selectNodes = gridApi.selection.getSelectedRows();
           console.log(scope.selectNodes);
        });

      };

    }
  };
}
