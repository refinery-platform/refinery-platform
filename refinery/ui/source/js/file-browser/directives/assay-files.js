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
       assayAttributes: '@',
       assayAttributeOrder: '@'
    },
    link: function(scope, element, attr, ctrl){
      ctrl.updateAssayFiles().then(function(){
        ctrl.checkUrlQueryFilters();
        ctrl.createColumnDefs();
      });
      ctrl.updateAssayAttributes();
    }
  };
}
