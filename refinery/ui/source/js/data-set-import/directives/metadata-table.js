'use strict';

function metadataTableDirective (fileUploadStatusService, $) {
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

      // scope.$on('$stateChangeStart', function (event) {
      //  console.log('in the location');
      //  var answer = confirm('Are you sure you want to leave this page?');
      //  if (!answer) {
      //    event.preventDefault();
      //  }
      // });

      // scope.$on('$locationChangeStart', function (event, next, current) {
      //  console.log(next);
      //  console.log(current);
      //  var answer = '';
      //  if (next !== current) {
      //    console.log('yawn');
      //    answer = confirm('Are you sure you want to navigate this page');
      //  }
      //  if (!answer) {
      //    event.preventDefault();
      //  }
      // });

      $(window).on('beforeunload', function () {
        return 'Files uploading or tabular data in previewwill be lost.';
      });
    }
  };
}

angular
  .module('refineryDataSetImport')
  .directive('metadataTable', [
    'fileUploadStatusService',
    '$',
    metadataTableDirective
  ]);
