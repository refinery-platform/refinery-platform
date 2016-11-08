'use strict';

function rpAssayFilesUtilModal (
  $compile,
  $templateCache,
  $uibModal,
  resetGridService
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
    '$templateCache',
    '$uibModal',
    'resetGridService',
    rpAssayFilesUtilModal
  ]
  );
