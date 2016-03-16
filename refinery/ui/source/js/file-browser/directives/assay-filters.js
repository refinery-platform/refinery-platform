angular.module('refineryFileBrowser')
    .directive("rpFileBrowserAssayFilters",
  [
    'fileBrowserFactory',
    rpFileBrowserAssayFilters
  ]
);

function rpFileBrowserAssayFilters(fileBrowserFactory) {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-filters.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
       attributeFilter: '=?bind',
       analysisFilter: '=?bind'
    },
    link: function(scope){

      scope.selectedField = {};
      scope.selectedFieldList = {};
      var selectedFieldQuery = {};

      scope.attributeSelectionUpdate = function(internal_name, field){
        if(scope.selectedField[field] &&
          typeof scope.selectedFieldList[internal_name] !== 'undefined'){
          scope.selectedFieldList[internal_name].push(field);

        }else if(scope.selectedField[field]){
          scope.selectedFieldList[internal_name]=[field];

        }else{
          var ind = scope.selectedFieldList[internal_name].indexOf(field);
          if(ind > -1){
            scope.selectedFieldList[internal_name].splice(ind, 1);
          }
          if(scope.selectedFieldList[internal_name].length === 0){
            delete scope.selectedFieldList[internal_name];
          }

        }
        scope.filesParam['filter_attribute']= scope.selectedFieldList;

        scope.FBCtrl.updateAssayFiles().then(function(){
          scope.gridOptions = {
          data: scope.FBCtrl.assayFiles
          };
        });
      };
    }
  };
}
