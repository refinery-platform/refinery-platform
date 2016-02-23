angular.module('refineryFileBrowser')
    .directive("rpFileBrowserAssayFiles",
  [
    '$rootScope',
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
       assayAttributes: '@'
    },
    link: function(scope, element, attr){
      scope.FBCtrl.updateAssayFiles();
    }
  };
}
