angular.module('refineryWorkflows', ['angularFileUpload', 'ngGrid'])

.controller('MetadataTableImportCtrl', ['$scope', '$log', function($scope, $log) {
  'use strict';

  $scope.gridOptions = {
    data: 'metadataSample',
    columnDefs: 'columnDefs',
    enableColumnResize: true
  };

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
    // set to file name without extension by default
    $scope.title = $scope.selectedFile.name.replace(/\.[^/.]+$/, "");
    var reader = new FileReader();
    reader.onload = function(e) {
      $scope.metadata = d3.tsv.parse(e.target.result);
      $scope.metadataSample = $scope.metadata.slice(0, 9);
      $scope.metadataHeader = Object.keys($scope.metadataSample[0]);
      $scope.columnDefs = makeColumnDefs($scope.metadataHeader);
      $scope.$digest();
    };
    reader.readAsText($scope.selectedFile);
  };
}]);
