'use strict';

function rpFileBrowserAssayFiles () {
  return {
    restrict: 'E',
    templateUrl: '/static/partials/file-browser/partials/assay-files.html',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    bindToController: {
      assayFiles: '@',
      assayAttributes: '@'
    },
    link: function (scope, element, attr, ctrl) {
      ctrl.checkDataSetOwnership();
      ctrl.refreshAssayFiles().then(function () {
        ctrl.checkUrlQueryFilters();
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive('rpFileBrowserAssayFiles', [
    rpFileBrowserAssayFiles
  ]
);
