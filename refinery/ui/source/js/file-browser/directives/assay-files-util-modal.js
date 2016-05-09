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
        var template = $templateCache.get('assayfilesutilmodal.html');
        var modalContent = $compile(template)(scope);

        modalInstance = $uibModal.open({
          template: modalContent,
          controller: 'AssayFilesUtilModalCtrl',
          controllerAs: 'AFUMCtrl'
        });

        modalInstance.result.then(function () {
          resetGridService.setResetGridFlag(true);
        }, function () {
          resetGridService.setResetGridFlag(true);
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
