angular
  .module('refineryFileBrowser')
  .directive(
    'rpAssayFilesUtilModal',
    [
      '$compile',
      '$templateCache',
      '$uibModal',
      rpAssayFilesUtilModal
    ]
  );

function rpAssayFilesUtilModal($compile, $templateCache, $uibModal) {
  "use strict";
  return {
    restrict: 'AE',
    controller: 'FileBrowserCtrl',
    controllerAs: 'FBCtrl',
    link: function(scope, element) {

      element.bind("click", function(e) {
        var template = $templateCache.get("assayfilesutilmodal.html");
        var modalContent = $compile(template)(scope);

        $uibModal.open({
          template:modalContent,
          controller: 'AssayFilesUtilModalCtrl',
          controllerAs: 'AFUMCtrl'
        });

      });
    }
  };
}
