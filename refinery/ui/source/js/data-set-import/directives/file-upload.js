(function () {
  'use strict';

  angular
    .module('refineryDataSetImport')
    .directive('rpFileUpload', rpFileUpload);

  rpFileUpload.$inject = ['$window'];

  function rpFileUpload ($window) {
    return {
      restrict: 'E',
      bindToController: {
        isNodeUpdate: '=',
        fileName: '=',
        nodeUuid: '='
      },
      controller: 'RefineryFileUploadCtrl as FileCtrl',
      templateUrl: function () {
        return $window.getStaticUrl('partials/data-set-import/partials/file-upload.html');
      }
    };
  }
})();
