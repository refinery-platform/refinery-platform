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

function rpAssayFilesUtilModal(
  $compile,
  $templateCache,
  $uibModal,
  resetGridService
) {
  "use strict";
  return {
    restrict: 'AE',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    link: function(scope, element, attr, ctrl) {
      var modalInstance;

      element.bind("click", function(e) {
        var template = $templateCache.get("assayfilesutilmodal.html");
        var modalContent = $compile(template)(scope);

        modalInstance =  $uibModal.open({
          template:modalContent,
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
