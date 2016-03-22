angular
  .module('refineryFileBrowser')
  .directive("rpFileBrowserAssayFilters",
  [
    '$timeout',
    '$location',
    rpFileBrowserAssayFilters
  ]
);

function rpFileBrowserAssayFilters( $timeout, $location) {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-filters.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
       attributeFilter: '@',
       analysisFilter: '@'
    },
    link: function(scope, element){

      //ng-click event for attribute filter panels
      scope.dropAttributePanel = function(e, attributeName){
        e.preventDefault();
        var escapeAttributeName = attributeName.replace(' ', '-');
        var attribute = angular.element(
          document.querySelector('#' + escapeAttributeName)
        );
        if(attribute.hasClass('in')){
          attribute.removeClass('in');
        }else{
          attribute.addClass('in');
        }
      };

      //Drop down windows when they are in the URL query
      scope.$on('rf/attributeFilter-ready', function(){
        var queryFields = Object.keys($location.search());
        var allFilters = {};
        angular.copy(scope.FBCtrl.attributeFilter, allFilters);
            allFilters['Analysis'] = scope.FBCtrl.analysisFilter['Analysis'];

        angular.forEach(allFilters, function (attributeObj, attribute) {
          var allFields = Object.keys(attributeObj.facetObj);
          //time out allows the dom to load
          $timeout(function () {
            updateDomDropdown(allFields, queryFields, attribute);
          }, 0);
        });
      });

      //Loops through fields to find matching attributes and drops down panel
      var updateDomDropdown = function(allFields, queryFields, attributeName){
        for(var ind=0; ind<allFields.length; ind++){
          if(queryFields.indexOf(allFields[ind]) > -1){
            var escapeAttributeName = attributeName.replace(' ', '-');
            angular.element(
              document.querySelector('#' + escapeAttributeName)
            ).addClass('in');
            break;
          }
        }
      };
    }
  };
}
