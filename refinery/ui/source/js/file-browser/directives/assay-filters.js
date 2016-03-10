angular.module('refineryFileBrowser')
    .directive("rpFileBrowserAssayFilters",
  [
    '$location',
    'fileBrowserFactory',
    rpFileBrowserAssayFilters
  ]
);

function rpFileBrowserAssayFilters($location, fileBrowserFactory) {
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
      var query = $location.search();
      var queryKeys = Object.keys(query);

      //checks url for params to update the filter
      scope.checkUrlQueryFilters = function(){
        //Merge attribute and analysis filter data obj
        var allFilters = scope.FBCtrl.attributeFilter;
        allFilters['Analysis'] = scope.FBCtrl.analysisFilter['Analysis'];

        angular.forEach(allFilters, function(fieldObj, attribute) {
          updateSelectedFieldFromQuery(fieldObj);
        });
      };

      var updateSelectedFieldFromQuery = function(fieldObj){
        angular.forEach(fieldObj.facetObj, function (value, field) {
          if(queryKeys.indexOf(field) > -1){
            scope.selectedField[field]=true;
            scope.attributeSelectionUpdate(fieldObj.internal_name,
             field);
          }
        });
      };

      //ng-click event for attribute filter panels
      scope.dropAttributePanel = function(e, attributeIndex){
        e.preventDefault();
        var attribute = $('#' + attributeIndex);
        var classStr = attribute[0].className;
        if(classStr.indexOf('in') > -1){
          attribute.removeClass('in');
        }else{
          attribute.addClass('in');
        }
      };

      //Updates which attribute filters are selected and the ui-grid data
      scope.attributeSelectionUpdate = function(internal_name, field){
        if(scope.selectedField[field] &&
          typeof scope.selectedFieldList[internal_name] !== 'undefined'){
          scope.selectedFieldList[internal_name].push(field);
          $location.search(field, scope.selectedField[field]);

        }else if(scope.selectedField[field]){
          scope.selectedFieldList[internal_name]=[field];
          $location.search(field, scope.selectedField[field]);

        }else{
          var ind = scope.selectedFieldList[internal_name].indexOf(field);
          if(ind > -1){
            scope.selectedFieldList[internal_name].splice(ind, 1);
          }
          if(scope.selectedFieldList[internal_name].length === 0){
            delete scope.selectedFieldList[internal_name];
          }
          $location.search(field, null);

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
