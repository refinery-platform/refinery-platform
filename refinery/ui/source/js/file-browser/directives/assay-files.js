angular.module('refineryFileBrowser')
    .directive("rpFileBrowserAssayFiles",
  [
    rpFileBrowserAssayFiles
  ]
);

function rpFileBrowserAssayFiles() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-files.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
       assayFiles: '@',
       assayAttributes: '@',
       assayFiles2: '@'
    },
    link: function(scope){

      scope.gridOptions = {
       };

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

      scope.FBCtrl.updateAssayFiles().then(function(){
        createColumnDefs();
        scope.gridOptions = {
        columnDefs: customColumnName,
        data: scope.FBCtrl.assayFiles,
        enableRowSelection: true,
        enableSelectAll: true,
        selectionRowHeaderWidth: 35,
        rowHeight: 35,
        showGridFooter:true
        };
      });

      scope.gridOptions.multiSelect = true;
    }
  };
}
