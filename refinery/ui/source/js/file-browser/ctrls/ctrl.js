'use strict';

function FileBrowserCtrl (
  $scope,
  $location,
  uiGridConstants,
  fileBrowserFactory,
  resetGridService,
  isOwnerService,
  $timeout,
  $q,
  $window,
  _
  ) {
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];
  vm.attributeFilter = [];
  vm.analysisFilter = [];
  vm.nodeCount = 0;
  vm.filesParam = {
    uuid: $window.externalAssayUuid
  };

  // Ui-grid parameters
  vm.customColumnName = [];
  vm.queryKeys = Object.keys($location.search());
  vm.selectedField = {};
  vm.selectedFieldList = {};
  vm.selectNodes = [];
  vm.gridOptions = {
    appScopeProvider: vm,
    infiniteScrollRowsFromEnd: 40,
    infiniteScrollUp: true,
    infiniteScrollDown: true,
    useExternalSorting: true,
    enableRowSelection: true,
    enableSelectAll: true,
    selectionRowHeaderWidth: 35,
    rowHeight: 35,
    showGridFooter: false,
    enableSelectionBatchEvent: true,
    multiSelect: true
  };
  vm.firstPage = 0;
  vm.lastPage = 0;
  vm.rowCount = 100;
  vm.assayFilesTotal = 1;
  vm.totalPages = 1;
  vm.cachePages = 2;

  vm.refreshAssayFiles = function () {
    vm.filesParam.offset = vm.lastPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;

    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam).then(function () {
      vm.nodeCount = fileBrowserFactory.nodeCount.value;
      vm.assayFiles = vm.assayFiles.concat(fileBrowserFactory.assayFiles);
      vm.gridOptions.data = vm.assayFiles;
      vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
      vm.totalPages = Math.floor(vm.assayFilesTotal / vm.rowCount);
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
      vm.createColumnDefs();
      promise.resolve();
    });
    return promise.promise;
  };

  // checks url for params to update the filter
  vm.checkUrlQueryFilters = function () {
    var allFilters = {};
    // Merge attribute and analysis filter data obj
    angular.copy(vm.attributeFilter, allFilters);
    if (typeof vm.analysisFilter.Analysis !== 'undefined') {
      allFilters.Analysis = vm.analysisFilter.Analysis;
    }

    // for attribute filter directive, drop panels in query
    $scope.$broadcast('rf/attributeFilter-ready');
    angular.forEach(allFilters, function (attributeObj) {
      vm.refreshSelectedFieldFromQuery(attributeObj);
    });
    vm.filesParam.filter_attribute = {};
    angular.copy(vm.selectedFieldList, vm.filesParam.filter_attribute);
    vm.reset();
  };

  // helper method, upon refresh/load add fields to select data objs from query
  vm.refreshSelectedFieldFromQuery = function (_attributeObj) {
    angular.forEach(_attributeObj.facetObj, function (fieldObj) {
      if (vm.queryKeys.indexOf(fieldObj.name) > -1) {
        vm.selectedField[fieldObj.name] = true;
        vm.updateSelectionList(_attributeObj.internal_name, fieldObj.name);
      }
    });
  };

  // Updates selection field list and url
  vm.updateSelectionList = function (internalName, field) {
    if (vm.selectedField[field] &&
      typeof vm.selectedFieldList[internalName] !== 'undefined') {
      // add field url query and selectedList
      vm.selectedFieldList[internalName].push(field);
      $location.search(field, vm.selectedField[field]);
    } else if (vm.selectedField[field]) {
      // add field url query and selectedList
      vm.selectedFieldList[internalName] = [field];
      $location.search(field, vm.selectedField[field]);
    } else {
      var ind = vm.selectedFieldList[internalName].indexOf(field);
      if (ind > -1) {
        vm.selectedFieldList[internalName].splice(ind, 1);
      }
      if (vm.selectedFieldList[internalName].length === 0) {
        delete vm.selectedFieldList[internalName];
      }
      $location.search(field, null);
    }
  };


  // Updates which attribute filters are selected and the ui-grid data
  vm.attributeSelectionUpdate = function (_internalName, _field) {
    vm.updateSelectionList(_internalName, _field);
    vm.filesParam.filter_attribute = {};
    angular.copy(vm.selectedFieldList, vm.filesParam.filter_attribute);
    vm.reset();
  };


  // Ui-grid methods for catching grid events
  vm.gridOptions.onRegisterApi = function (gridApi) {
    // set gridApi on scope

    // Infinite Grid Load
    gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
    gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);
    vm.gridApi = gridApi;

    // Sort events
    vm.gridApi.core.on.sortChanged(null, vm.sortChanged);
    vm.sortChanged(vm.gridApi.grid, [vm.gridOptions.columnDefs[1]]);

    // Checkbox selection events
    vm.gridApi.selection.on.rowSelectionChanged(null, function () {
      vm.selectNodes = gridApi.selection.getSelectedRows();
    });

    vm.gridApi.selection.on.rowSelectionChangedBatch(null, function () {
      vm.selectNodes = gridApi.selection.getSelectedRows();
    });
  };


  vm.getDataDown = function () {
    vm.lastPage++;
    vm.filesParam.offset = vm.lastPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;
    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam)
      .then(function () {
        vm.assayFiles = vm.assayFiles.concat(fileBrowserFactory.assayFiles);
        vm.gridApi.infiniteScroll.saveScrollPercentage();
        vm.gridOptions.data = vm.assayFiles;
        vm.gridApi.infiniteScroll
          .dataLoaded(vm.firstPage > 0, vm.lastPage < vm.totalPages)
          .then(function () {
            vm.checkDataLength('up');
          })
          .then(function () {
            promise.resolve();
          });
      }, function () {
        vm.gridApi.infiniteScroll.dataLoaded();
        promise.reject();
      });
    return promise.promise;
  };


  vm.getDataUp = function () {
    if (vm.firstPage > 0) {
      vm.firstPage--;
    }

    vm.filesParam.offset = vm.firstPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;
    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam)
      .then(function () {
        vm.assayFiles = fileBrowserFactory.assayFiles.concat(vm.assayFiles);
        vm.gridApi.infiniteScroll.saveScrollPercentage();
        vm.gridOptions.data = vm.assayFiles;
        vm.gridApi.infiniteScroll
          .dataLoaded(vm.firstPage > 0, vm.lastPage < vm.totalPages)
          .then(function () {
            vm.checkDataLength('down');
          })
          .then(function () {
            promise.resolve();
          });
      }, function () {
        vm.gridApi.infiniteScroll.dataLoaded();
        promise.reject();
      });
    return promise.promise;
  };


  vm.checkDataLength = function (discardDirection) {
    // work out whether we need to discard a page, if so discard from the
    // direction passed in
    if (vm.lastPage - vm.firstPage > vm.cachePages) {
      // we want to remove a page
      vm.gridApi.infiniteScroll.saveScrollPercentage();

      if (discardDirection === 'up') {
        vm.assayFiles = vm.assayFiles.slice(vm.rowCount);
        vm.firstPage++;
        $timeout(function () {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedTop(
            vm.firstPage > 0, vm.lastPage < vm.totalPages
          );
        });
      } else {
        vm.assayFiles = vm.assayFiles.slice(0, vm.rowCount * vm.cachePages);
        vm.lastPage--;
        $timeout(function () {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedBottom(
            vm.firstPage > 0, vm.lastPage < vm.totalPages
          );
        });
      }
    }
  };

  vm.reset = function () {
    vm.firstPage = 0;
    vm.lastPage = 0;

    // turn off the infinite scroll handling up and down
    if (typeof vm.gridApi !== 'undefined') {
      vm.gridApi.infiniteScroll.setScrollDirections(false, false);

      vm.assayFiles = [];

      vm.refreshAssayFiles().then(function () {
        $timeout(function () {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
          vm.gridApi.infiniteScroll.resetScroll(vm.firstPage > 0, vm.lastPage < vm.totalPages);
          resetGridService.setResetGridFlag(false);
        });
      });
    }
  };


  // Generates param: sort for api call from ui-grid response
  vm.sortChanged = function (grid, sortColumns) {
    if (typeof sortColumns !== 'undefined' &&
        typeof sortColumns[0] !== 'undefined' &&
        typeof sortColumns[0].sort !== 'undefined') {
      switch (sortColumns[0].sort.direction) {
        case uiGridConstants.ASC:
          vm.filesParam.sort = sortColumns[0].field + ' asc';
          vm.reset();
          break;
        case uiGridConstants.DESC:
          vm.filesParam.sort = sortColumns[0].field + ' desc';
          vm.reset();
          break;
        default:
          vm.reset();
          break;
      }
    }
  };

  // populates the ui-grid columns variable
  vm.createColumnDefs = function () {
    vm.customColumnName = [];

    // some attributes will be duplicate in different fields, duplicate
    // column names will throw an error. This prevents duplicates
    var uniqAssayAttributes = _.uniq(vm.assayAttributes, true,
      function (attributeObj) {
        return attributeObj.display_name;
      });
    var totalChars = vm.assayAttributes.reduce(function (previousValue, facetObj) {
      return previousValue + String(facetObj.display_name).length;
    }, 0);

    uniqAssayAttributes.forEach(function (attribute) {
      var columnName = attribute.display_name;
      var columnWidth = columnName.length / totalChars * 100;
      if (columnWidth < 10) {  // make sure columns are wide enough
        columnWidth = Math.round(columnWidth * 2);
      }


      if (columnName === 'Url') {
        vm.customColumnName.push(vm.setCustomUrlColumnDef(columnName));
      } else {
        vm.customColumnName.push(
          {
            name: columnName,
            width: columnWidth + '%',
            field: attribute.internal_name,
            cellTooltip: true,
            enableHiding: false
          }
        );
      }
    });
    vm.gridOptions.columnDefs = vm.customColumnName;
  };
  // File download column require unique template and fields.
  vm.setCustomUrlColumnDef = function (_columnName) {
    var cellTemplate = '<div class="ngCellText"' +
          ' ng-class="col.colIndex()" style="text-align:center">' +
          '<div ng-if="COL_FIELD"' +
            'title="Download File \{{COL_FIELD}}\">' +
          '<a href="{{COL_FIELD}}" target="_blank">' +
          '<i class="fa fa-arrow-circle-o-down"></i></a>' +
          '</div>' +
          '<div ng-if="!COL_FIELD"' +
            'title="File not available for download">' +
          '<i class="fa fa-bolt"></i>' +
          '</div>' +
          '</div>';

    return {
      name: _columnName,
      field: _columnName,
      cellTooltip: true,
      width: 4 + '%',
      displayName: '',
      enableFiltering: false,
      enableSorting: false,
      enableColumnMenu: false,
      enableColumnResizing: false,
      cellTemplate: cellTemplate
    };
  };

  vm.checkDataSetOwnership = function () {
    isOwnerService.refreshDataSetOwner().then(function () {
      vm.isOwner = isOwnerService.isOwner;
    });
  };

  $scope.$watch(
    function () {
      return resetGridService.resetGridFlag;
    },
    function () {
      if (resetGridService.resetGridFlag) {
        vm.reset();
      }
    }
  );
}


angular
  .module('refineryFileBrowser')
  .controller('FileBrowserCtrl',
  [
    '$scope',
    '$location',
    'uiGridConstants',
    'fileBrowserFactory',
    'resetGridService',
    'isOwnerService',
    '$timeout',
    '$q',
    '$window',
    '_',
    FileBrowserCtrl
  ]);

