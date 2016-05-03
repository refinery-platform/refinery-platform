'use strict';

function MetadataTableImportCtrl (
  $scope, $log, $http, $uibModal, fileSources
) {
  $scope.gridOptions = {
    data: 'metadataSample',
    resizeable: true
  };

  $scope.badFileList = [];

  function makeColumnDefs (row) {
    // calculate column widths according to each column header length
    var totalChars = row.reduce(function (previousValue, currentValue) {
      return previousValue + String(currentValue).length;
    }, 0);
    var columnDefs = [];
    row.forEach(function (element) {
      var columnName = String(element);
      var columnWidth = columnName.length / totalChars * 100;
      if (columnWidth < 10) {  // make sure columns are wide enough
        columnWidth = Math.round(columnWidth * 2);
      }
      columnDefs.push({
        field: columnName,
        width: columnWidth + '%'
      });
    });
    return columnDefs;
  }

  $scope.onFileSelect = function ($files) {
    if (!$files[0]) {
      // clear existing content from screen if user didn't select a file
      $scope.$apply(function () {
        // TODO: clear $files?
        $scope.metadataSample = [];
        $scope.metadataHeader = [];
        $scope.columnDefs = [];
      });
      return;
    }
    $scope.selectedFile = $files[0];
    // set title to uploaded file name minus extension by default
    $scope.title = $scope.selectedFile.name.replace(/\.[^/.]+$/, '');
    var reader = new FileReader();
    reader.onload = function (e) {
      $scope.$apply(function () {
        $scope.metadata = d3.tsv.parse(e.target.result);
        // get 5 lines to display on screen
        $scope.metadataSample = $scope.metadata.slice(0, 5);
        $scope.metadataHeader = Object.keys($scope.metadataSample[0]);
        $scope.gridOptions.columnDefs = makeColumnDefs($scope.metadataHeader);
      });
    };
    reader.readAsText($scope.selectedFile);
  };

  $scope.data = {
    dataFileColumn: null
  };

  $scope.checkFiles = function () {
    // check if the files listed in the dataFileColumn exist on the server
    var fileData = {
      base_path: $scope.basePath,
      list: []
    };
    // get the list of file references
    if ($scope.data.dataFileColumn) {
      $scope.metadata.forEach(function (row) {
        fileData.list.push(row[$scope.data.dataFileColumn]);
      });
    }
    fileSources.check(fileData,
      function (response) {
        var checkFilesDialogConfig;
        if (response.length > 0) {
          checkFilesDialogConfig = {
            title: 'The following files were not found on the server:',
            items: response
          };
        } else {
          checkFilesDialogConfig = {
            title: 'All files were found on the server',
            items: response
          };
        }
        $uibModal.open({
          templateUrl:
            '/static/partials/metadata-table-import/partials/list-confirmation-dialog.html',
          controller: 'ConfirmationDialogInstanceCtrl as modal',
          size: 'lg',
          resolve: {
            config: function () {
              return checkFilesDialogConfig;
            }
          }
        });
      },
      function (response, status) {
        var errorMsg = 'Request failed: error ' + status;
        $log.error(errorMsg);
      }
    );
  };
}

angular
  .module('refineryMetadataTableImport')
  .controller('MetadataTableImportCtrl', [
    '$scope',
    '$log',
    '$http',
    '$uibModal',
    'fileSources',
    MetadataTableImportCtrl
  ]);
