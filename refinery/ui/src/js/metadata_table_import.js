angular.module('refineryMetadataTableImport', ['angularFileUpload', 'ngGrid'])

.config(['$httpProvider', function($httpProvider) {
  // use Django XSRF/CSRF lingo to enable communication with API
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
}])

.controller('MetadataTableImportCtrl',
  ['$scope', '$log', '$http', function($scope, $log, $http) {

  'use strict';

  $scope.gridOptions = {
    data: 'metadataSample',
    columnDefs: 'columnDefs',
    enableColumnResize: true
  };

  $scope.badFileList = [];

  function makeColumnDefs(row) {
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
        $scope.metadataSample = $scope.metadata.slice(0, 5);
        $scope.metadataHeader = Object.keys($scope.metadataSample[0]);
        $scope.columnDefs = makeColumnDefs($scope.metadataHeader);
      });
    };
    reader.readAsText($scope.selectedFile);
  };

  $scope.checkFiles = function() {
    // check if the files listed in the dataFileColumn exist on the server
    var dataFileList = [];
    $scope.metadata.forEach(function(row) {
      // assumes $scope.dataFileColumn was selected
      if ($scope.basePath) {
        dataFileList.push($scope.basePath + row[$scope.dataFileColumn]);
      } else {
        dataFileList.push(row[$scope.dataFileColumn]);
      }
    });
    var req = {
      method: 'POST',
      url: '/data_set_manager/import/check_files/',
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      data: dataFileList
    };
    $http(req).success(function(response) {
      if (response.length > 0) {
        var errorMsg = "The following files were not found on the server:\n\n";
        response.forEach(function(filePath) {
          errorMsg += filePath + "\n\n";
        });
        alert(errorMsg);
      } else {
        alert("All files were found");
      }
    }).error(function(response, status) {
      $log.error("Request failed: error " + status);
    });
  };
}]);
