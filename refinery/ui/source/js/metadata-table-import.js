angular.module('refineryMetadataTableImport', ['angularFileUpload', 'ngGrid'])

.config(['$httpProvider', function($httpProvider) {
  // use Django XSRF/CSRF lingo to enable communication with API
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}])

.factory('fileSources', ['$http', function($http) {
  "use strict";

  return {
    check: function(fileData, successCallback, errorCallback) {
      var req = {
        method: 'POST',
        url: '/data_set_manager/import/check_files/',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        data: fileData
      };
      $http(req).success(successCallback).error(errorCallback);
    }
  };
}])

.controller('MetadataTableImportCtrl',
  ['$scope', '$log', '$http', '$modal', 'fileSources',
    function($scope, $log, $http, $modal, fileSources) {

  "use strict";

  $scope.gridOptions = {
    data: 'metadataSample',
    columnDefs: 'columnDefs',
    enableColumnResize: true
  };

  $scope.badFileList = [];

  function makeColumnDefs(row) {
    // calculate column widths according to each column header length
    var totalChars = row.reduce(function(previousValue, currentValue) {
      return previousValue + String(currentValue).length;
    }, 0);
    var columnDefs = [];
    row.forEach(function(element) {
      var columnName = String(element);
      var columnWidth = columnName.length / totalChars * 100;
      if (columnWidth < 10) {  // make sure columns are wide enough
        columnWidth = Math.round(columnWidth * 2);
      }
      columnDefs.push({'field': columnName, 'width': columnWidth + "%"});
    });
    return columnDefs;
  }

  $scope.onFileSelect = function($files) {
    if (! $files[0]) {
      // clear existing content from screen if user didn't select a file
      $scope.$apply(function(){
        //TODO: clear $files?
        $scope.metadataSample = [];
        $scope.metadataHeader = [];
        $scope.columnDefs = [];
      });
      return;
    }
    $scope.selectedFile = $files[0];
    // set title to uploaded file name minus extension by default
    $scope.title = $scope.selectedFile.name.replace(/\.[^/.]+$/, "");
    var reader = new FileReader();
    reader.onload = function(e) {
      $scope.$apply(function() {
        $scope.metadata = d3.tsv.parse(e.target.result);
        // get 5 lines to display on screen
        $scope.metadataSample = $scope.metadata.slice(0, 5);
        $scope.metadataHeader = Object.keys($scope.metadataSample[0]);
        $scope.columnDefs = makeColumnDefs($scope.metadataHeader);
      });
    };
    reader.readAsText($scope.selectedFile);
  };

  $scope.checkFiles = function() {
    // check if the files listed in the dataFileColumn exist on the server
    var fileData = {"base_path": $scope.basePath, "list": []};
    // get the list of file references
    if ($scope.dataFileColumn) {
      $scope.metadata.forEach(function (row) {
        fileData.list.push(row[$scope.dataFileColumn]);
      });
    }
    fileSources.check(fileData,
      function(response) {
        var checkFilesDialogConfig;
        if (response.length > 0) {
          checkFilesDialogConfig = {
            title: "The following files were not found on the server:",
            items: response
          };
        } else {
          checkFilesDialogConfig = {
            title: "All files were found on the server",
            items: response
          };
        }
        var modalInstance = $modal.open({
          templateUrl: '/static/partials/list_confirmation_dialog.html',
          controller: ConfirmationDialogInstanceCtrl,
          size: 'lg',
          resolve: {
            config: function() {
              return checkFilesDialogConfig;
            }
          }
        });
      },
      function(response, status) {
        var errorMsg = "Request failed: error " + status;
        $log.error(errorMsg);
        alert(errorMsg);
      }
    );
  };
}]);

var ConfirmationDialogInstanceCtrl = function($scope, $modalInstance, config) {
  $scope.config = config;

  $scope.ok = function () {
    $modalInstance.close();
  };
};
