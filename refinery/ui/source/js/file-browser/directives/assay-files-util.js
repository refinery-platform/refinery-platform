angular
  .module('refineryFileBrowser')
  .directive("rpAssayFilesUtil",
  [
    rpAssayFilesUtil
  ]
);

function rpAssayFilesUtil() {
    "use strict";

  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-files-util.html',
    //transclude: true,
    link: function(scope, element, attr, ctrl){

      console.log('rpAssayFilesUtil');
    }
  };
}
