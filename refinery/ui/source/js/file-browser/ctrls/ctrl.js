'use strict';

function FileBrowserCtrl (
  $location,
  $log,
  $q,
  $scope,
  $timeout,
  uiGridConstants,
  _,
  $window,
  fileBrowserFactory,
  fileBrowserSettings,
  filesLoadingService,
  isOwnerService,
  resetGridService,
  selectedFilterService,
  selectedNodesService
  ) {
  var maxFileRequest = fileBrowserSettings.maxFileRequest;
  var vm = this;
  // params for the assays api
  vm.filesParam = {
    uuid: $window.externalAssayUuid
  };
  // attribute list from api
  vm.assayAttributes = fileBrowserFactory.assayAttributes;
  // objs used by ui to generate filters
  vm.attributeFilter = fileBrowserFactory.attributeFilter;
  vm.analysisFilter = fileBrowserFactory.analysisFilter;

  // Ui-grid parameters
  vm.gridApi = undefined; // avoids duplicate grid generation
  vm.queryKeys = Object.keys($location.search());
  /** used by ui to select/deselect, attributes have an object of filter fields
   * attributeInternalName: {fieldName: boolean, fieldName: boolean} */
  vm.uiSelectedFields = {};
  vm.selectNodesCount = 0;
  vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
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
    enableSelectionBatchEvent: true,
    multiSelect: true,
    columnDefs: fileBrowserFactory.customColumnNames,
    data: fileBrowserFactory.assayFiles,
    showGridFooter: true,
    gridFooterTemplate: '<rp-is-assay-files-loading></rp-is-assay-files-loading>'
  };
  // variables supporting ui-grid dynamic scrolling
  vm.firstPage = 0;
  vm.lastPage = 0;
  vm.rowCount = maxFileRequest;
  vm.totalPages = 1;
  vm.cachePages = 2;
  vm.counter = 0;
  // flag to help with timing issues when selecting node group
  vm.afterNodeGroupUpdate = false;

  /*
 * -----------------------------------------------------------------------------
 * Methods
 * -----------------------------------------------------------------------------
 */

   /**
   * A main method which grabs all the data set nodes, attributes, and updates
   * ui-grid params.
  */
  vm.refreshAssayFiles = function () {
    vm.filesParam.offset = vm.lastPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;

    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam).then(function () {
      // create column names
      vm.gridOptions.columnDefs = fileBrowserFactory.createColumnDefs();

      // Grabbing 100 files per request, keeping max of 300 at a time
      // Ui-grid rows generated from assay files
      vm.gridOptions.data = fileBrowserFactory.assayFiles;
      vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
      // turns off infinite scroll for data sets < 100 files
      if (vm.assayFilesTotal < maxFileRequest && vm.gridApi) {
        vm.gridApi.infiniteScroll.setScrollDirections(false, false);
      }
      vm.totalPages = Math.floor(vm.assayFilesTotal / vm.rowCount);
      vm.assayAttributes = fileBrowserFactory.assayAttributes;
      vm.attributeFilter = fileBrowserFactory.attributeFilter;
      vm.analysisFilter = fileBrowserFactory.analysisFilter;
      promise.resolve();
    }, function (error) {
      $log.error(error);
    });
    return promise.promise;
  };

  // checks url for params to update the filter
  vm.updateFiltersFromUrlQuery = function () {
    var allFilters = {};
    // Merge attribute and analysis filter data obj
    angular.copy(vm.attributeFilter, allFilters);
    if (typeof vm.analysisFilter.Analysis !== 'undefined') {
      allFilters.Analysis = vm.analysisFilter.Analysis;
    }

    angular.forEach(allFilters, function (attributeObj) {
      vm.refreshSelectedFieldFromQuery(attributeObj);
    });
    vm.filesParam.filter_attribute = {};
    angular.copy(selectedFilterService.attributeSelectedFields,
      vm.filesParam.filter_attribute);
  };

  // helper method, upon refresh/load add fields to select data objs from query
  vm.refreshSelectedFieldFromQuery = function (_attributeObj) {
    // stringify/encode attributeInternalName:fieldName for url query comparison
    angular.forEach(_attributeObj.facetObj, function (fieldObj) {
      var encodedField = selectedFilterService.stringifyAndEncodeAttributeObj(
        _attributeObj.internal_name,
        fieldObj.name
      );

      if (vm.queryKeys.indexOf(encodedField) > -1) {
        if (!vm.uiSelectedFields.hasOwnProperty(_attributeObj.internal_name)) {
          vm.uiSelectedFields[_attributeObj.internal_name] = {};
        }
        vm.uiSelectedFields[_attributeObj.internal_name][fieldObj.name] = true;
        selectedFilterService.updateSelectedFilters(
          vm.uiSelectedFields[_attributeObj.internal_name],
          _attributeObj.internal_name,
          fieldObj.name
        );
      }
    });
  };

  // Used by ui, updates which attribute filters are selected and ui-grid data
  vm.attributeSelectionUpdate = function (internalName, field) {
    selectedFilterService.updateSelectedFilters(
      vm.uiSelectedFields[internalName], internalName, field
    );
    vm.filesParam.filter_attribute = {};
    angular.copy(selectedFilterService.attributeSelectedFields,
      vm.filesParam.filter_attribute
    );
    // Resets selection
    selectedNodesService.setSelectedAllFlags(false);
    // resets grid
    vm.reset();
  };

  // Ui-grid methods for catching grid events
  vm.gridOptions.onRegisterApi = function (gridApi) {
    // prevent scoping issues, after reset or initial generation
    if (!vm.gridApi) {
      vm.gridApi = gridApi;
      gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
      gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);

      // Sort events
      vm.gridApi.core.on.sortChanged(null, vm.sortChanged);
      vm.sortChanged(vm.gridApi.grid, [vm.gridOptions.columnDefs[1]]);

      // Checkbox selection events
      vm.gridApi.selection.on.rowSelectionChanged(null, function (row) {
        // When selected All, watching the deselect events for complement nodes
        if (selectedNodesService.selectedNodeGroupUuid &&
          selectedNodesService.selectedNodeGroupUuid !==
          selectedNodesService.defaultCurrentSelectionUuid) {
          if (vm.afterNodeGroupUpdate) {
            vm.afterNodeGroupUpdate = false;
            selectedNodesService.resetNodeGroupSelection(true);
          }
        }

        if (selectedNodesService.selectedAllFlag) {
          selectedNodesService.setComplementSeletedNodes(row);
          vm.selectNodesCount = vm.assayFilesTotal -
            selectedNodesService.complementSelectedNodes.length;
        } else {
          // add or remove row to list
          selectedNodesService.setSelectedNodes(row);
          vm.selectNodesCount = selectedNodesService.selectedNodes.length;
        }

        // when not current selection, check if a new row was deselect/selected
        if (selectedNodesService.selectedNodeGroupUuid !==
          selectedNodesService.defaultCurrentSelectionUuid &&
          selectedNodesService.selectedNodesUuidsFromNodeGroup.length !==
          selectedNodesService.selectedNodes.length) {
          // Reset the node group selection to current selection
          selectedNodesService.resetNodeGroupSelection(true);
        }
      });

      // Event only occurs when checkbox is selected/deselected.
      vm.gridApi.selection.on.rowSelectionChangedBatch(null, function (eventRows) {
        // When event all occurs, the node group should be current selection
        selectedNodesService.resetNodeGroupSelection(true);
        // Checking the first row selected, ensures it's a true select all
        if (eventRows[0].isSelected) {
          selectedNodesService.setSelectedAllFlags(true);
          // Need to manually set vm.selectNodesCount to count of all list
          vm.selectNodesCount = vm.assayFilesTotal;
        } else {
          selectedNodesService.setSelectedAllFlags(false);
          vm.selectNodesCount = 0;
        }
      });
    }
  };

  // Helper function: select rows on the ui-grid
  vm.setGridSelectedRows = function (uuidsList) {
    // If user scrolls quickly, there could be a delay for selected items
    angular.forEach(vm.gridApi.grid.rows, function (gridRow) {
      if (uuidsList.indexOf(gridRow.entity.uuid) > -1) {
        vm.gridApi.selection.selectRow(gridRow.entity);
      }
    });
  };

   // Helper function: unselect rows on the ui-grid
  vm.setGridUnselectedRows = function (uuidsList) {
    // If user scrolls quickly, there could be a delay for selected items
    angular.forEach(vm.gridApi.grid.rows, function (gridRow) {
      // select rows if not in complement list
      if (uuidsList.indexOf(gridRow.entity.uuid) === -1) {
        vm.gridApi.selection.selectRow(gridRow.entity);
      }
    });
  };

  // Method to select/deselect rows programmically after dynamic
  // scroll adds more data, at reset and per 300 rows
  var correctRowSelectionInUI = function () {
    // select all event, track complements
    if (selectedNodesService.selectedAllFlag) {
      // ensure complement nodes are deselected
      vm.setGridUnselectedRows(selectedNodesService.complementSelectedNodesUuids);
      // previous selected nodes maintained during infinite scrolling
    } else if (selectedNodesService.selectedNodes.length > 0) {
      vm.setGridSelectedRows(selectedNodesService.selectedNodesUuids);
    }
  };

  // Helper method for dynamic scrolling, grabs data when scrolling down
  vm.getDataDown = function () {
    vm.lastPage++;
    vm.filesParam.offset = vm.lastPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;
    var promise = $q.defer();
    filesLoadingService.setIsAssayFilesLoading(true);
    fileBrowserFactory.getAssayFiles(vm.filesParam, 'down')
      .then(function () {
        vm.gridApi.infiniteScroll.saveScrollPercentage();
        vm.gridOptions.data = fileBrowserFactory.assayFiles;
        filesLoadingService.setIsAssayFilesLoading(false);
        vm.gridApi.infiniteScroll
          .dataLoaded(vm.firstPage > 0, vm.lastPage < vm.totalPages)
          .then(function () {
            vm.checkDataLength('up');
            // programmically select/deselect due to new rows
            correctRowSelectionInUI();
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

  // Helper method for dynamic scrolling, grabs data when scrolling up
  vm.getDataUp = function () {
    if (vm.firstPage > 0) {
      vm.firstPage--;
    }

    vm.filesParam.offset = vm.firstPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;
    var promise = $q.defer();
    filesLoadingService.setIsAssayFilesLoading(true);
    fileBrowserFactory.getAssayFiles(vm.filesParam, 'up')
      .then(function () {
        vm.gridApi.infiniteScroll.saveScrollPercentage();
        vm.gridOptions.data = fileBrowserFactory.assayFiles;
        filesLoadingService.setIsAssayFilesLoading(false);
        vm.gridApi.infiniteScroll
          .dataLoaded(vm.firstPage > 0, vm.lastPage < vm.totalPages)
          .then(function () {
            vm.checkDataLength('down');
            // programmically select/deselect due to new rows
            correctRowSelectionInUI();
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

  // Helper method to keep track when data should be discard or added
  vm.checkDataLength = function (discardDirection) {
    // work out whether we need to discard a page, if so discard from the
    // direction passed in
    if (vm.lastPage - vm.firstPage > vm.cachePages) {
      // we want to remove a page
      vm.gridApi.infiniteScroll.saveScrollPercentage();

      if (discardDirection === 'up') {
        fileBrowserFactory.trimAssayFiles(vm.rowCount);
        vm.firstPage++;
        $timeout(function () {
          // wait for grid to ingest data changes
          vm.gridApi.infiniteScroll.dataRemovedTop(
            vm.firstPage > 0, vm.lastPage < vm.totalPages
          );
        });
      } else {
        fileBrowserFactory.trimAssayFiles(vm.rowCount * vm.cachePages, 0);
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

  // Reset the data, selected rows, and scroll position in the grid
  vm.reset = function () {
    vm.firstPage = 0;
    vm.lastPage = 0;
    // reset service data
    angular.copy([], fileBrowserFactory.assayFiles);

    // turn off the infinite scroll handling up and down
    if (typeof vm.gridApi !== 'undefined') {
      vm.gridApi.infiniteScroll.setScrollDirections(false, false);

      vm.refreshAssayFiles(vm.filesParam).then(function () {
        $timeout(function () {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
          vm.gridApi.infiniteScroll.resetScroll(vm.firstPage > 0, vm.lastPage < vm.totalPages);
          resetGridService.setResetGridFlag(false);
          // Select rows either from node group lists or previously selected
          if (selectedNodesService.selectedNodesUuidsFromNodeGroup.length > 0) {
            selectedNodesService.setSelectedNodesFromNodeGroup(
              selectedNodesService.selectedNodesUuidsFromNodeGroup
            );
            selectedNodesService.selectNodesCount = selectedNodesService
              .selectedNodesUuidsFromNodeGroup.length;
            correctRowSelectionInUI();
            vm.afterNodeGroupUpdate = true;
          } else if (selectedNodesService.selectedNodes.length > 0) {
            selectedNodesService.selectNodesCount = selectedNodesService.selectedNodesUuids.length;
            correctRowSelectionInUI();
          } else {
            vm.gridApi.selection.clearSelectedRows();
            selectedNodesService.selectNodesCount = 0;
          }
        });
      });
    }
  };

   /**
   * Generates sort param for api call from ui-grid response and calls grid
    * reset
   * @param {obj} grid - ui-grid obj
   * @param {string} sortColumns - string defining sort direction
   */
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


  // Sets boolean for data set ownership
  vm.checkDataSetOwnership = function () {
    isOwnerService.refreshDataSetOwner().then(function () {
      vm.isOwner = isOwnerService.isOwner;
    });
  };

  // Helper method which check for any data updates during soft loads (tabbing)
  var checkAndUpdateGridData = function () {
    fileBrowserFactory.getAssayFiles(vm.filesParam)
      .then(function () {
        if (vm.assayFilesTotal !== fileBrowserFactory.assayFilesTotalItems.count) {
          if (vm.assayFilesTotal < maxFileRequest) {
            vm.gridOptions.data = fileBrowserFactory.assayFiles;
          }
          vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
        }
      });
  };

  /**
   * Checks whether the page requires data (hard/soft page load) and
   * updates data, filters, ui-grid selections, and url query
  */
  var initializeDataOnPageLoad = function () {
     // Hard reset / url with query requires waiting for api response
    if (fileBrowserFactory.assayFiles.length === 0) {
      vm.refreshAssayFiles().then(function () {
        if (Object.keys($location.search()).length > 0) {
          vm.updateFiltersFromUrlQuery();
          // drop panels in ui from query
          $scope.$broadcast('rf/attributeFilter-ready');
          vm.reset();
        }
      });
      // Tabbing does not require api response wait and update query in URL
    } else {
      checkAndUpdateGridData();
      // updates view model's selected attribute filters
      angular.forEach(selectedFilterService.attributeSelectedFields, function (
        fieldArr,
        attributeInternalName
      ) {
        for (var i = 0; i < fieldArr.length; i++) {
          vm.uiSelectedFields[attributeInternalName][fieldArr[i]] = true;
          // update url with selected fields(filters)
          var encodedAttribute = selectedFilterService
            .stringifyAndEncodeAttributeObj(attributeInternalName, fieldArr[i]);
          selectedFilterService.updateUrlQuery(encodedAttribute, true);
        }
      });
      // $timeout required to allow grid generation
      $timeout(function () {
        // for attribute filter directive, drop panels in query
        $scope.$broadcast('rf/attributeFilter-ready');
        // update selected rows in ui and set selected nodes count
        correctRowSelectionInUI();
      }, 0);
    }
  };

/*
 * -----------------------------------------------------------------------------
 * Watchers and Method Calls
 * -----------------------------------------------------------------------------
 */
  // Reset grid flag if set to true, grid, params, filters, and nodes resets
  $scope.$watch(
    function () {
      return resetGridService.resetGridFlag;
    },
    function () {
      if (resetGridService.resetGridFlag) {
        // Have to set selected Fields in control due to service scope
        angular.forEach(vm.uiSelectedFields, function (fieldsObj, attributeInternalName) {
          angular.forEach(fieldsObj, function (value, fieldName) {
            vm.uiSelectedFields[attributeInternalName][fieldName] = false;
          });
          selectedFilterService.resetAttributeFilter(fieldsObj);
        });
        vm.selectNodesCount = 0;
        vm.filesParam.filter_attribute = {};
        vm.reset();
      }
    }
  );

  /**
   *  Refresh grid flag if set to true, grid, but keep params, filters, & nodes
   *  Require for utils modal as it lives in this parent ctrl scope.
   */
  $scope.$watch(
    function () {
      return resetGridService.refreshGridFlag;
    },
    function () {
      if (resetGridService.refreshGridFlag) {
        // reset assayFiles
        angular.copy([], fileBrowserFactory.assayFiles);
        initializeDataOnPageLoad();
        resetGridService.setRefreshGridFlag(false);
      }
    }
  );

  // Ensure data owner
  vm.checkDataSetOwnership();
  // initialize the dataset and updates ui-grid selection, filters, and url
  initializeDataOnPageLoad();
}

angular
  .module('refineryFileBrowser')
  .controller('FileBrowserCtrl',
  [
    '$location',
    '$log',
    '$q',
    '$scope',
    '$timeout',
    'uiGridConstants',
    '_',
    '$window',
    'fileBrowserFactory',
    'fileBrowserSettings',
    'filesLoadingService',
    'isOwnerService',
    'resetGridService',
    'selectedFilterService',
    'selectedNodesService',
    FileBrowserCtrl
  ]);

