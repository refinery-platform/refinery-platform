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

      //scope.getAllSelected = function(internal_name) {
      //  var value = '';
      //  scope.selectedFieldList = {};
      //
      //  angular.forEach(scope.selectedField, function (key, internalNameAndField) {
      //    field = internalNameAndField.split('=')[1];
      //
      //    if(key && typeof scope.selectedFieldList[internal_name] !== 'undefined') {
      //      scope.selectedFieldList[internal_name].push(field);
      //    }else if(key){
      //      scope.selectedFieldList[internal_name]=[field];
      //    }else{
      //      var ind = scope.selectedFieldList[internal_name].indexOf(field);
      //      if(ind > -1) {
      //        scope.selectedFieldList[internal_name].splice(ind, 1);
      //      }
      //    }
      //  });
      //  console.log(scope.selectedFieldList);
      //};


      scope.selectedFieldList = {};
      scope.attributeSelectionUpdate = function(internal_name, field){
        if(scope.selectedField[field]){
          if(typeof scope.selectedFieldList[internal_name] !== 'undefined'){
            scope.selectedFieldList[internal_name].push(field);
          }else{
            scope.selectedFieldList[internal_name]=[field];
          }
        }else{
          var ind = scope.selectedFieldList[internal_name].indexOf(field);
          if(ind > -1){
            scope.selectedFieldList[internal_name].splice(ind, 1);
          }
        }
      };
    }
  };
}
