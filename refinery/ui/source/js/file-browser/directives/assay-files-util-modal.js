(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .directive('rpAssayFilesUtilModal', rpAssayFilesUtilModal);

  rpAssayFilesUtilModal.$inject = [
    '$uibModal',
    '$window',
    'resetGridService'
  ];

  function rpAssayFilesUtilModal (
    $uibModal,
    $window,
    resetGridService
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
})();
