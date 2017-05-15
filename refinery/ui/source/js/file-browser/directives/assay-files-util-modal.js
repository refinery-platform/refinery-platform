'use strict';

function rpAssayFilesUtilModal (
  resetGridService,
  $window,
  $uibModal
) {
  return {
    restrict: 'AE',
    link: function (scope, element) {
      var modalInstance;
      var modalDetailUrl = $window.getStaticUrl(
        'partials/file-browser/partials/assay-files-util-modal-detail.html'
      );
      element.bind('click', function () {
        modalInstance = $uibModal.open({
          templateUrl: modalDetailUrl,
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
    'resetGridService',
    '$window',
    '$uibModal',
    rpAssayFilesUtilModal
  ]);
