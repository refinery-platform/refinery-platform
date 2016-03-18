angular
  .module('refineryFileBrowser')
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
       assayAttributes: '@'
    },
    link: function(scope){

      scope.FBCtrl.updateAssayFiles().then(function(){
        scope.FBCtrl.checkUrlQueryFilters();
        scope.FBCtrl.createColumnDefs();
      });

    }
  };
}
