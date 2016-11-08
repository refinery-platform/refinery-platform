'use strict';

function rpAssayFilesUtilModal (
  $compile,
  resetGridService,
  $templateCache,
  $uibModal
) {
  return {
    restrict: 'AE',
    link: function (scope, element) {
      var modalInstance;
      element.bind('click', function () {
        modalInstance = $uibModal.open({
          templateUrl: '/static/partials/file-browser/partials/assay-files-util-modal-detail.html',
          controller: 'AssayFilesUtilModalCtrl',
          controllerAs: 'AFUMCtrl'
        });
        // default calls when modal closes or dismisses
        modalInstance.result.then(function () {
          resetGridService.setRefreshGridFlag(true);
        }, function () {
          resetGridService.setRefreshGridFlag(true);
        });
      });
    }
  };
}

angular
  .module('refineryFileBrowser')
  .directive(
  'rpAssayFilesUtilModal',
  [
    '$compile',
    'resetGridService',
    '$templateCache',
    '$uibModal',
    rpAssayFilesUtilModal
  ]
  );
