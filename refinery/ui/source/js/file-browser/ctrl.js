angular
  .module('refineryFileBrowser')
  .controller('FileBrowserCtrl',
    [
      '$scope',
      '$location',
      'uiGridConstants',
      'fileBrowserFactory',
      '$window',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl(
  $scope,
  $location,
  uiGridConstants,
  fileBrowserFactory,
  $window) {

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
    infiniteScrollRowsFromEnd: 10,
    infiniteScrollUp: true,
    infiniteScrollDown: true,
    useExternalSorting: true,
    enableRowSelection: true,
    enableSelectAll: true,
    selectionRowHeaderWidth: 35,
    rowHeight: 35,
    showGridFooter:false,
    enableSelectionBatchEvent: true,
    multiSelect: true,
  };
  vm.firstPage = 2;
  vm.lastPage = 2;
  vm.rowCount = 50;

  vm.updateAssayFiles = function () {
    console.log('page');
    console.log(vm.lastPage);
     var pageDiff = vm.lastPage - vm.firstPage;
    vm.filesParam['offset'] = pageDiff * vm.rowCount;
    //figure out how to change limit according to vh
    vm.filesParam['limit'] = vm.rowCount ;
    console.log(vm.filesParam);
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
    vm.filesParam['filter_attribute'] = vm.selectedFieldList;
    vm.updateAssayFiles();
  };

  //Ui-grid methods for catching grid events
  vm.gridOptions.onRegisterApi = function(gridApi) {
    //set gridApi on scope

    vm.gridApi = gridApi;

    //Infinite Grid Load
    gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
    gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);

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

//  vm.getFirstData = function() {
    //var promise = $q.defer();
    //$http.get('/data/10000_complex.json')
    //.success(function(data) {
    //  var newData = vm.getPage(data, vm.lastPage);
    //  vm.data = vm.data.concat(newData);
    //  promise.resolve();
    //});
    //return promise.promise;
  //};

  vm.getDataDown = function() {
    console.log('in get Data Down');
    //vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage <
    // 4 );

    vm.updateAssayFiles().then(function() {
      vm.lastPage++;
      console.log('in the then');
      var newData = vm.getPage(vm.assayFiles, vm.lastPage);
      console.log('newData');
      console.log(newData);
      vm.gridApi.infiniteScroll.saveScrollPercentage();
      vm.assayFiles = vm.assayFiles.concat(newData);
      vm.gridApi.infiniteScroll
        .dataLoaded(vm.firstPage > 0, vm.lastPage < 10)
        .then(function() {
          vm.checkDataLength('up');
        });
    });
    //var promise = $q.defer();
    //$http.get('/data/10000_complex.json')
    //.success(function(data) {
    //  vm.lastPage++;
    //  var newData = vm.getPage(data, vm.lastPage);
    //  vm.gridApi.infiniteScroll.saveScrollPercentage();
    //  vm.data = vm.data.concat(newData);
    //  vm.gridApi.infiniteScroll.dataLoaded(vm.firstPage > 0, vm.lastPage < 4).then(function() {vm.checkDataLength('up');}).then(function() {
    //    promise.resolve();
    //  });
    //})
    //.error(function(error) {
    //  vm.gridApi.infiniteScroll.dataLoaded();
    //  promise.reject();
    //});
    //return promise.promise;
  };

  vm.getDataUp = function() {
    //vm.filesParam['offset'] = 0;
    //vm.filesParam['limit'] = 100;
    //updateAssayFiles().then(function() {
    //  vm.lastPage++;
    //  var newData = vm.getPage(data, vm.lastPage());
    //  vm.gridApi.infiniteScroll.saveScrollPercentage();
    //  vm.data = vm.data.concat(newData);
    //  vm.gridApi.infiniteScroll
    //    .dataLoaded(vm.firstPage > 0, vm.lastPage < 4)
    //    .then(function () {
    //      vm.checkDataLength('down');
    //    })
    //    .then(function () {
    //      promise.resolve();
    //    });
   // });
    //var promise = $q.defer();
    //$http.get('/data/10000_complex.json')
    //.success(function(data) {
    //  vm.firstPage--;
    //  var newData = vm.getPage(data, vm.firstPage);
    //  vm.gridApi.infiniteScroll.saveScrollPercentage();
    //  vm.data = newData.concat(vm.data);
    //  vm.gridApi.infiniteScroll.dataLoaded(vm.firstPage > 0, vm.lastPage < 4).then(function() {vm.checkDataLength('down');}).then(function() {
    //    promise.resolve();
    //  });
    //})
    //.error(function(error) {
    //  vm.gridApi.infiniteScroll.dataLoaded();
    //  promise.reject();
    //});
    //return promise.promise;
  };

  vm.getPage = function(data, page) {
  //  console.log('getPage');
  //  console.log(data);
  //  console.log(page);
    var res = [];
    for (var i = (page * vm.rowCount); i < (page + 1) * vm.rowCount && i < data.length; ++i) {
      res.push(data[i]);
    }
    return res;
  };

  vm.checkDataLength = function( discardDirection) {
    // work out whether we need to discard a page, if so discard from the direction passed in
    console.log('incheckdatalength');
    if( vm.lastPage - vm.firstPage > 3 ){
      // we want to remove a page
      vm.gridApi.infiniteScroll.saveScrollPercentage();

      if( discardDirection === 'up' ){
        vm.data = vm.data.slice(vm.rowCount);
        vm.firstPage++;
        $timeout(function() {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedTop(vm.firstPage > 0, vm.lastPage < 10);
        });
      } else {
        vm.data = vm.data.slice(0, 400);
        vm.lastPage--;
        $timeout(function() {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedBottom(vm.firstPage > 0, vm.lastPage < 10);
        });
      }
    }
  };

  vm.reset = function() {
    vm.firstPage = 2;
    vm.lastPage = 2;

    // turn off the infinite scroll handling up and down - hopefully this won't be needed after @swalters scrolling changes
    vm.gridApi.infiniteScroll.setScrollDirections( false, false );
    vm.data = [];

    vm.getFirstData().then(function(){
      $timeout(function() {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
        vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage < 10 );
      });
    });
  };

  //bm.getFirstData().then(function(){
  //  $timeout(function() {
  //    // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
  //    // you need to call resetData once you've loaded your data if you want to enable scroll up,
  //    // it adjusts the scroll position down one pixel so that we can generate scroll up events
  //    vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage < 4 );
  //  });
  //});




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
