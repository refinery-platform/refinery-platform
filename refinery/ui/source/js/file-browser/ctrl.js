angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    [
      '$location',
      '$scope',
      'fileBrowserFactory',
      'assayFileService',
      '$window',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl($location, $scope, fileBrowserFactory, assayFileService, $window) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];
  vm.attributeFilter = [];
  vm.analysisFilter = [];
  vm.customColumnName = [];
  vm.queryKeys = Object.keys($location.search());

  //Param is generated from services
  $scope.filesParam = {'uuid': $window.externalAssayUuid};
  $scope.selectedField = {};
  $scope.selectedFieldList = {};
  $scope.gridOptions = {
    useExternalSorting: true,
    enableRowSelection: true,
    enableSelectAll: true,
    selectionRowHeaderWidth: 35,
    rowHeight: 35,
    showGridFooter:true,
    enableSelectionBatchEvent: true,
    info: {},
    multiSelect: true
  };

  //vm.updateAssayFiles = function (filterAttribute, limit, offset) {
  vm.updateAssayFiles = function () {
    console.log("in update Assay");

    return fileBrowserFactory.getAssayFiles($scope.filesParam).then(function (response) {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;

      vm.createColumnDefs();
      $scope.gridOptions = {
      columnDefs: vm.customColumnName,
      data: $scope.FBCtrl.assayFiles
      };
      return vm.assayFiles;
    });
  };

  vm.updateAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    },function(error){
      console.log(error);
    });
  };

  //checks url for params to update the filter
  vm.checkUrlQueryFilters = function(){
    //Merge attribute and analysis filter data obj
    var allFilters = vm.attributeFilter;
    allFilters['Analysis'] = vm.analysisFilter['Analysis'];

    angular.forEach(allFilters, function(fieldObj, attribute) {
      vm.updateSelectedFieldFromQuery(fieldObj, attribute);
    });
  };

  vm.updateSelectedFieldFromQuery = function(fieldObj, attribute){
    angular.forEach(fieldObj.facetObj, function (value, field) {
      if(vm.queryKeys.indexOf(field) > -1){
        console.log(vm.queryKeys);
        $scope.selectedField[field]=true;
        vm.attributeSelectionUpdate(fieldObj.internal_name, field);
      }
    });
  };

  //Updates which attribute filters are selected and the ui-grid data
  vm.attributeSelectionUpdate = function(internal_name, field){
    if($scope.selectedField[field] &&
      typeof $scope.selectedFieldList[internal_name] !== 'undefined'){
      $scope.selectedFieldList[internal_name].push(field);
      $location.search(field, $scope.selectedField[field]);

    }else if($scope.selectedField[field]){
      $scope.selectedFieldList[internal_name]=[field];
      $location.search(field, $scope.selectedField[field]);

    }else{
      var ind = $scope.selectedFieldList[internal_name].indexOf(field);
      if(ind > -1){
        $scope.selectedFieldList[internal_name].splice(ind, 1);
      }
      if($scope.selectedFieldList[internal_name].length === 0){
        delete $scope.selectedFieldList[internal_name];
      }
      $location.search(field, null);

    }
    $scope.filesParam['filter_attribute']= $scope.selectedFieldList;

    vm.updateAssayFiles().then(function(){
      $scope.gridOptions = {
        data: vm.assayFiles
      };
    });
  };

  vm.createColumnDefs = function(){
    vm.assayAttributes.forEach(function(attribute){
      vm.customColumnName.push(
        {
          name: attribute.display_name,
          field: attribute.internal_name
        }
      );
    });
  };

}
