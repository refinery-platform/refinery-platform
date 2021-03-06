'use strict';

function metadataTableDirective (
  $,
  $window,
  fileUploadStatusService,
  metadataStatusService
) {
  return {
    bindToController: {
      importOption: '='
    },
    controller: 'MetadataTableImportCtrl',
    controllerAs: 'metadataTable',
    restrict: 'E',
    replace: true,
    templateUrl: function () {
      return $window.getStaticUrl('partials/data-set-import/partials/metadata-table.html');
    },
    link: function (scope, element, attrs, ctrl) {
      scope.isAdvancedCollapsed = true;
      // use to check pattern of public shortcut name
      scope.urlShortcutRegex = /^[a-zA-Z0-9_]*$/;

      scope.sampleMetadataUrl = $window.getStaticUrl('sample-files/refinery-sample-metadata.tsv');
      ctrl.fileStatus = fileUploadStatusService.fileUploadStatus.status;

      // Watches for tab navigation
      scope.$on('$stateChangeStart', function (event) {
        if (metadataStatusService.metadataPreviewStatus) {
          var warning = 'Uploading in progress: data may be lost.';
          var answer = confirm(warning); // eslint-disable-line no-alert
          if (!answer) {
            event.preventDefault();
          } else {
            metadataStatusService.setMetadataPreviewStatus(false);
          }
        }
      });

      // Watches for navigation away from the import template
      /*eslint-disable */
      //suppress all warnings between comments
      $(window).on('beforeunload', function () {
        if (metadataStatusService.metadataPreviewStatus) {
          return 'Uploading files or tabular data in preview will be lost.';
        }
      });
      /*eslint-enable */

      scope.$watchCollection(
        function () {
          return fileUploadStatusService.fileUploadStatus;
        },
        function (statusObj) {
          ctrl.fileStatus = statusObj.status;
        }
      );
    }
  };
}

angular
  .module('refineryDataSetImport')
  .directive('metadataTable', [
    '$',
    '$window',
    'fileUploadStatusService',
    'metadataStatusService',
    metadataTableDirective
  ]);
