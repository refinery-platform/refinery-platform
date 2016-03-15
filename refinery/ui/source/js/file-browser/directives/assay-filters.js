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
       attributeFilter: '@',
       analysisFilter: '@'
    },
    link: function(scope){

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

    }
  };
}
