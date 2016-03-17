angular.module('refineryFileBrowser')
    .controller('FileBrowserCtrl',
    [
      '$scope',
      '$location',
      'uiGridConstants',
      'fileBrowserFactory',
      '$window',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl($scope, $location, uiGridConstants, fileBrowserFactory, $window) {
  "use strict";
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];
  vm.attributeFilter = [];
  vm.analysisFilter = [];
  vm.filesParam = {'uuid': $window.externalAssayUuid};

  //Ui-grid parameters
  vm.customColumnName = [];
  vm.queryKeys = Object.keys($location.search());
  vm.selectedField = {};
  vm.selectedFieldList = {};
  vm.gridOptions = {
    appScopeProvider: vm,
    useExternalSorting: true,
    enableRowSelection: true,
    enableSelectAll: true,
    selectionRowHeaderWidth: 35,
    rowHeight: 35,
    showGridFooter:true,
    enableSelectionBatchEvent: true,
    multiSelect: true
  };

  vm.updateAssayFiles = function () {
    return fileBrowserFactory.getAssayFiles(vm.filesParam).then(function () {
      vm.assayFiles = fileBrowserFactory.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
      vm.gridOptions.data =  vm.assayFiles;
    });
  };

  vm.updateAssayAttributes = function () {
    var assay_uuid = $window.externalAssayUuid;
    return fileBrowserFactory.getAssayAttributeOrder(assay_uuid).then(function(){
      vm.assayAttributeOrder = fileBrowserFactory.assayAttributeOrder;
    },function(error){
      console.log(error);
    });
  };

  //checks url for params to update the filter
  vm.checkUrlQueryFilters = function(){
    var allFilters = {};
    //Merge attribute and analysis filter data obj
    angular.copy(vm.attributeFilter, allFilters);
    allFilters['Analysis'] = vm.analysisFilter['Analysis'];
    //for attribute filter directive, drop panels in query
    $scope.$broadcast('rf/attributeFilter-ready');
    angular.forEach(allFilters, function(fieldObj, attribute) {
      vm.refreshSelectedFieldFromQuery(fieldObj, attribute);
    });


  };

  vm.refreshSelectedFieldFromQuery = function(fieldObj, attribute){
    angular.forEach(fieldObj.facetObj, function (value, field) {
      if(vm.queryKeys.indexOf(field) > -1){
        vm.selectedField[field]=true;
        vm.attributeSelectionUpdate(fieldObj.internal_name, field, attribute);
      }
    });
  };

  //Updates which attribute filters are selected and the ui-grid data
  vm.attributeSelectionUpdate = function(internal_name, field){
    if(vm.selectedField[field] &&
      typeof vm.selectedFieldList[internal_name] !== 'undefined'){
      vm.selectedFieldList[internal_name].push(field);
      $location.search(field, vm.selectedField[field]);

    }else if(vm.selectedField[field]){
      vm.selectedFieldList[internal_name]=[field];
      $location.search(field, vm.selectedField[field]);

    }else{
      var ind = vm.selectedFieldList[internal_name].indexOf(field);
      if(ind > -1){
        vm.selectedFieldList[internal_name].splice(ind, 1);
      }
      if(vm.selectedFieldList[internal_name].length === 0){
        delete vm.selectedFieldList[internal_name];
      }
      $location.search(field, null);
    }
    vm.filesParam['filter_attribute']= vm.selectedFieldList;
    vm.updateAssayFiles();
  };

  //Ui-grid methods for catching grid events
  vm.gridOptions.onRegisterApi = function(gridApi) {
    //set gridApi on scope

    vm.gridApi = gridApi;

    //Sort events
    vm.gridApi.core.on.sortChanged( null, vm.sortChanged );
    vm.sortChanged(vm.gridApi.grid, [ vm.gridOptions.columnDefs[1] ] );

    //Checkbox selection events
    vm.gridApi.selection.on.rowSelectionChanged(null, function (row) {
       vm.selectNodes = gridApi.selection.getSelectedRows();
    });

    vm.gridApi.selection.on.rowSelectionChangedBatch(null, function (rows) {
      vm.selectNodes = gridApi.selection.getSelectedRows();
    });
  };

  //Generates param: sort for api call from ui-grid response
  vm.sortChanged = function ( grid, sortColumns ) {
    if (typeof sortColumns !== 'undefined' &&
      typeof sortColumns[0] !== 'undefined') {
      switch (sortColumns[0].sort.direction) {
        case uiGridConstants.ASC:
          vm.filesParam['sort'] = sortColumns[0].field + ' asc';
          vm.updateAssayFiles();
          break;
        case uiGridConstants.DESC:
          vm.filesParam['sort'] = sortColumns[0].field + ' desc';
          vm.updateAssayFiles();
          break;
        case undefined:
          vm.updateAssayFiles();
          break;
      }
    }
  };

  //populates the  ui-grid columns variable
  vm.createColumnDefs = function(){
    vm.assayAttributes.forEach(function(attribute){
      vm.customColumnName.push(
        {
          'name': attribute.display_name,
          'field': attribute.internal_name
        }
      );
    });
    vm.gridOptions.columnDefs = vm.customColumnName;
  };

}
