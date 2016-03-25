angular
  .module('refineryFileBrowser')
  .controller('FileBrowserCtrl',
    [
      '$scope',
      '$location',
      'uiGridConstants',
      'fileBrowserFactory',
      '$window',
      '$timeout',
      '$q',
      FileBrowserCtrl
    ]);


function FileBrowserCtrl(
  $scope,
  $location,
  uiGridConstants,
  fileBrowserFactory,
  $window,
  $timeout,
  $q) {

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
  //  rowHeight: 35,
    showGridFooter:false,
    enableSelectionBatchEvent: true,
    multiSelect: true,
  };
  vm.firstPage = 0;
  vm.lastPage = 0;
  vm.rowCount = 50;
  vm.assayFilesTotal = 1;
  vm.totalPage = 1;
  vm.cachePages = 2;

  vm.updateAssayFiles = function () {
     var pageDiff = vm.lastPage - vm.firstPage;
    vm.filesParam['offset'] = pageDiff * vm.rowCount;
    //figure out how to change limit according to vh
    vm.filesParam['limit'] = vm.rowCount ;
    console.log(vm.filesParam);

    return fileBrowserFactory.getAssayFiles(vm.filesParam).then(function () {
      vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
      vm.totalPage = Math.ceil(vm.assayFilesTotal/vm.rowCount);
    //  var newData = vm.getPage(fileBrowserFactory.assayFiles, vm.lastPage);
   //   vm.assayFiles = vm.assayFiles.concat(newData);
   //   vm.gridOptions.data = vm.assayFiles;
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
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
    vm.gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
    vm.gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);

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

  vm.getFirstData = function() {
    console.log('ingetfirstdata');
    var pageDiff = (vm.lastPage - vm.firstPage) + vm.firstPage;
    vm.filesParam['offset'] = pageDiff * vm.rowCount;
    //figure out how to change limit according to vh
    vm.filesParam['limit'] = vm.rowCount ;
    var promise = $q.defer();

    console.log(vm.filesParam);
    fileBrowserFactory.getAssayFiles(vm.filesParam)
    .then(function() {
      var newData = vm.getPage(fileBrowserFactory.assayFiles, vm.lastPage);
      //vm.assayFiles = vm.assayFiles.concat(newData);
      vm.assayFiles = vm.assayFiles.concat(newData);
      console.log(vm.assayFiles);
      vm.gridOptions.data = vm.assayFiles;
    //  vm.gridApi.infiniteScroll.dataLoaded();
      vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
      console.log('assayFilesTotal');
      console.log(vm.assayFilesTotal);
      vm.totalPage = Math.ceil(vm.assayFilesTotal/vm.rowCount);
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
      promise.resolve();
    });
    return promise.promise;
  };

  vm.getDataDown = function() {
    console.log('getDataDown');
    vm.lastPage++;
    console.log(vm.lastPage);
    var pageDiff = (vm.lastPage - vm.firstPage) + vm.firstPage;
    vm.filesParam['offset'] = pageDiff * vm.rowCount;
    //figure out how to change limit according to vh
    vm.filesParam['limit'] = vm.rowCount ;
    console.log(vm.filesParam);
    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam)
    .then(function() {
      var newData = vm.getPage(fileBrowserFactory.assayFiles, vm.lastPage);
      vm.gridApi.infiniteScroll.saveScrollPercentage();
      vm.assayFiles = vm.assayFiles.concat(newData);
      vm.gridOptions.data = vm.assayFiles;
      console.log('getDataDown');
      console.log(vm.gridApi.infiniteScroll);
      console.log(vm.firstPage);
      console.log(vm.lastPage);
      console.log('the vm total Pages');
      console.log(vm.totalPages);
      vm.gridApi.infiniteScroll.dataLoaded(vm.firstPage > -1, vm.lastPage < vm.totalPage);
        console.log('in the data loaded');
        vm.checkDataLength('up');
        promise.resolve();

    }, function(error) {
      vm.gridApi.infiniteScroll.dataLoaded();
       promise.reject();
    });
  //  console.log(vm.gridApi.infiniteScroll);

    return promise.promise;
  };

  vm.getDataUp = function() {
    var pageDiff = vm.lastPage - vm.firstPage;
    vm.filesParam['offset'] = pageDiff * vm.rowCount;
    //figure out how to change limit according to vh
    vm.filesParam['limit'] = vm.rowCount ;
    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam)
    .then(function() {
      vm.firstPage--;
      var newData = vm.getPage(fileBrowserFactory.assayFiles, vm.firstPage);
      vm.gridApi.infiniteScroll.saveScrollPercentage();
      vm.assayFiles = newData.concat(vm.assayFiles);
      vm.gridOptions.data = vm.assayFiles;
      vm.gridApi.infiniteScroll.dataLoaded(vm.firstPage > 0, vm.lastPage < 4).then(function() {vm.checkDataLength('down');}).then(function() {
        promise.resolve();
      });
    }, function(error) {
      vm.gridApi.infiniteScroll.dataLoaded();
      promise.reject();
    });
    return promise.promise;
  };

  vm.getPage = function(data, page) {
    var res = [];
    for (var i = 0; i < vm.rowCount && i < data.length; i++) {
      res.push(data[i]);
    }
    return res;
  };

  vm.checkDataLength = function( discardDirection) {
    console.log('checkDataLength');
    // work out whether we need to discard a page, if so discard from the direction passed in
    if( vm.lastPage - vm.firstPage > vm.cachePages ){
      console.log('remove page');
      // we want to remove a page
      vm.gridApi.infiniteScroll.saveScrollPercentage();

      if( discardDirection === 'up' ){
        vm.assayFiles = vm.assayFiles.slice(vm.rowCount);
        vm.firstPage++;
        console.log(vm.assayFiles.length);
        $timeout(function() {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedTop(vm.firstPage > 0, vm.lastPage < vm.totalPage);
        });
      } else {
        vm.assayFiles = vm.assayFiles.slice(0, vm.rowCount);
        vm.lastPage--;
        $timeout(function() {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedBottom(vm.firstPage > 0, vm.lastPage < vm.totalPage);
        });
      }
    }
  };

  vm.reset = function() {
    vm.firstPage = 0;
    vm.lastPage = 0;

    // turn off the infinite scroll handling up and down - hopefully this won't be needed after @swalters scrolling changes
    vm.gridApi.infiniteScroll.setScrollDirections( false, false );
    vm.assayFiles = [];

    vm.getFirstData().then(function(){
      $timeout(function() {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
        vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage < vm.totalPage );
      });
    });
  };

  //vm.getDataDown = function() {
  //  console.log('in get Data Down');
  //   var pageDiff = vm.lastPage - vm.firstPage;
  //  vm.filesParam['offset'] = pageDiff * vm.rowCount;
  //  //figure out how to change limit according to vh
  //  vm.filesParam['limit'] = vm.rowCount ;
  //  console.log(vm.filesParam);
  //
  //   var promise = $q.defer();
  //  fileBrowserFactory.getAssayFiles(vm.filesParam)
  //    .then(function () {
  //      vm.lastPage++;
  //      var newData = vm.getPage(fileBrowserFactory.assayFiles, vm.lastPage);
  //      vm.gridApi.infiniteScroll.saveScrollPercentage();
  //      vm.assayFiles = vm.assayFiles.concat(newData);
  //      vm.gridOptions.data =  vm.assayFiles;
  //
  //      console.log(vm.gridApi.infiniteScroll);
  //      vm.gridApi.infiniteScroll
  //        .dataLoaded(vm.firstPage > 0, vm.lastPage < vm.totalPage)
  //        .then(function() {
  //            console.log('infinite scroll in then');
  //            vm.checkDataLength('up');
  //        })
  //        .then(function(){
  //           promise.resolve();
  //        });
  //      }, function(error) {
  //        vm.gridApi.infiniteScroll.dataLoaded();
  //        promise.reject();
  //    });
  //    return promise.promise;

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
  //};

  //vm.getDataUp = function() {
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
  //};

  //vm.getPage = function(data, page) {
  //  var res = [];
  //  for (var i = (page * vm.rowCount); i < (page + 1) * vm.rowCount && i < data.length; ++i) {
  //    res.push(data[i]);
  //  }
  //  console.log('res');
  //  console.log(res);
  //  return res;
  //};
  //
  //vm.checkDataLength = function( discardDirection) {
  //  // work out whether we need to discard a page, if so discard from the direction passed in
  //  console.log('in check data length');
  //  if( vm.lastPage - vm.firstPage > vm.totalPage - 1 ){
  //    // we want to remove a page
  //    vm.gridApi.infiniteScroll.saveScrollPercentage();
  //
  //    if( discardDirection === 'up' ){
  //      vm.assayFiles = vm.assayFiles.slice(vm.rowCount);
  //      vm.firstPage++;
  //      $timeout(function() {
  //        // wait for grid to ingest data changes
  //        vm.gridApi.infiniteScroll.dataRemovedTop(vm.firstPage > 0, vm.lastPage < vm.totalPage);
  //      });
  //    } else {
  //      vm.assayFiles = vm.assayFiles.slice(0, vm.assayFilesTotal);
  //      vm.lastPage--;
  //      $timeout(function() {
  //        // wait for grid to ingest data changes
  //        vm.gridApi.infiniteScroll.dataRemovedBottom(vm.firstPage > 0, vm.lastPage < vm.totalPage);
  //      });
  //    }
  //  }
  //};
  //
  //vm.reset = function() {
  //  console.log('in reset');
  //  vm.firstPage = 0;
  //  vm.lastPage = 0;
  //
  //  // turn off the infinite scroll handling up and down - hopefully this won't be needed after @swalters scrolling changes
  //  vm.gridApi.infiniteScroll.setScrollDirections( false, false );
  //  vm.assayFiles = [];
  //
  //  //vm.getFirstData().then(function(){
  //  //  $timeout(function() {
  //  //    // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
  //  //    vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage < vm.totalPage );
  //  //  });
  //  //});
  //};
  ////
  ////vm.getFirstData().then(function(){
  ////  $timeout(function() {
  ////    // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
  ////    // you need to call resetData once you've loaded your data if you want to enable scroll up,
  ////    // it adjusts the scroll position down one pixel so that we can generate scroll up events
  ////    vm.gridApi.infiniteScroll.resetScroll( vm.firstPage > 0, vm.lastPage < vm.totalPage );
  ////  });
  ////});

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
