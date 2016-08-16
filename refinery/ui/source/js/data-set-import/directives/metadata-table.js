'use strict';

function metadataTableDirective (fileUploadStatusService) {
  return {
    bindToController: {
      importOption: '='
    },
    controller: 'MetadataTableImportCtrl',
    controllerAs: 'metadataTable',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/data-set-import/partials/metadata-table.html',
    link: function (scope, element, attrs, ctrl) {
      // Helper method to disable data file upload if files are uploading
      ctrl.areFilesUploading = function () {
        if (fileUploadStatusService.fileUploadStatus === 'running') {
          return true;
        }
        return false;
      };

      // Helper method to show warning text when data files are queued
      ctrl.areFilesInQueue = function () {
        if (fileUploadStatusService.fileUploadStatus === 'queuing') {
          return true;
        }
        return false;
      };
    }
  };
}

angular
  .module('refineryDataSetImport')
  .directive('metadataTable', [
    'fileUploadStatusService',
    metadataTableDirective
  ]);
