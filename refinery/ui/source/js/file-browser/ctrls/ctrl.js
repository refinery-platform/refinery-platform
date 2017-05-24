(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('FileBrowserCtrl', FileBrowserCtrl);

  FileBrowserCtrl.$inject = [
    '$location',
    '$log',
    '$q',
    '$scope',
    '$templateCache',
    '$timeout',
    'uiGridConstants',
    '_',
    '$window',
    'fileBrowserFactory',
    'fileBrowserSettings',
    'filesLoadingService',
    'fileRelationshipService',
    'isOwnerService',
    'resetGridService',
    'selectedFilterService',
    'selectedNodesService',
    'toolSelectService'
  ];

  function FileBrowserCtrl (
    $location,
    $log,
    $q,
    $scope,
    $templateCache,
    $timeout,
    uiGridConstants,
    _,
    $window,
    fileBrowserFactory,
    fileBrowserSettings,
    filesLoadingService,
    fileRelationshipService,
    isOwnerService,
    resetGridService,
    selectedFilterService,
    selectedNodesService,
    toolSelectService
  ) {
    var maxFileRequest = fileBrowserSettings.maxFileRequest;
    var nodesService = selectedNodesService;
    var fileService = fileRelationshipService;
    var toolService = toolSelectService;
    var vm = this;
    vm.activeNodeRow = nodesService.activeNodeRow;
    // flag to help with timing issues when selecting node group
    vm.afterNodeGroupUpdate = false;
    vm.analysisFilter = fileBrowserFactory.analysisFilter;
    // attribute list from api
    vm.assayAttributes = fileBrowserFactory.assayAttributes;
    vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
    // objs used by ui to generate filters
    vm.attributeFilter = fileBrowserFactory.attributeFilter;
    vm.attributeSelectionUpdate = attributeSelectionUpdate;
    // variable supporting ui-grid dynamic scrolling
    vm.cachePages = 2;
    vm.checkDataLength = checkDataLength;
    vm.checkDataSetOwnership = checkDataSetOwnership;
    vm.collapsedToolPanel = toolService.isToolPanelCollapsed;
    vm.counter = 0;
    // params for the assays api
    vm.filesParam = {
      uuid: $window.externalAssayUuid,
      offset: 0
    };
    vm.firstPage = 0;
    vm.getDataDown = getDataDown;
    vm.getDataUp = getDataUp;
    vm.gridApi = undefined; // avoids duplicate grid generation
    // Main ui-grid options
    vm.gridOptions = {
      appScopeProvider: vm,
      infiniteScrollRowsFromEnd: 40,
      infiniteScrollUp: true,
      infiniteScrollDown: true,
      useExternalSorting: true,
      selectionRowHeaderWidth: 35,
      rowHeight: 35,
      showGridFooter: true,
      multiSelect: true,
      columnDefs: fileBrowserFactory.customColumnNames,
      data: fileBrowserFactory.assayFiles,
      gridFooterTemplate: '<rp-is-assay-files-loading></rp-is-assay-files-loading>',
      onRegisterApi: gridRegister
    };
    vm.inputFileTypeColor = fileService.inputFileTypeColor;
    vm.lastPage = 0;  // variable supporting ui-grid dynamic scrolling
    vm.nodeSelectCollection = fileService.nodeSelectCollection;
    vm.openSelectionPopover = openSelectionPopover;
    vm.queryKeys = Object.keys($location.search()); // used for preset filters
    vm.refreshAssayFiles = refreshAssayFiles;
    vm.refreshSelectedFieldFromQuery = refreshSelectedFieldFromQuery;
    vm.reset = reset;
    vm.rowCount = maxFileRequest;
    vm.sortChanged = sortChanged;
    vm.toggleToolPanel = toggleToolPanel;
    vm.totalPages = 1;  // variable supporting ui-grid dynamic scrolling
    /** Used by ui to select/deselect, attributes have an object of filter fields
     * attributeInternalName: {fieldName: boolean, fieldName: boolean} */
    vm.uiSelectedFields = {};
    vm.updateFiltersFromUrlQuery = updateFiltersFromUrlQuery;

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      // Ensure data owner
      checkDataSetOwnership();
      // initialize the dataset and updates ui-grid selection, filters, and url
      initializeDataOnPageLoad();
    }

    // Used by ui, updates which attribute filters are selected and ui-grid data
    function attributeSelectionUpdate (internalName, field) {
      selectedFilterService.updateSelectedFilters(
        vm.uiSelectedFields[internalName], internalName, field
      );
      vm.filesParam.filter_attribute = {};
      angular.copy(selectedFilterService.attributeSelectedFields,
        vm.filesParam.filter_attribute
      );

      // resets grid
      vm.reset();
    }

    // Helper method to keep track when data should be discard or added
    function checkDataLength (discardDirection) {
      // work out whether we need to discard a page, if so discard from the
      // direction passed in to
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
    }

    // Sets boolean for data set ownership
    function checkDataSetOwnership () {
      isOwnerService.refreshDataSetOwner().then(function () {
        vm.isOwner = isOwnerService.isOwner;
      });
    }

    // Helper method for dynamic scrolling, grabs data when scrolling down
    function getDataDown () {
      vm.lastPage++;
      vm.filesParam.offset = vm.lastPage * vm.rowCount;
      vm.filesParam.limit = vm.rowCount;
      var promise = $q.defer();
      filesLoadingService.setIsAssayFilesLoading(true);
      fileBrowserFactory.getAssayFiles(vm.filesParam)
        .then(function () {
          vm.gridApi.infiniteScroll.saveScrollPercentage();
          vm.gridOptions.data = fileBrowserFactory.assayFiles;
          filesLoadingService.setIsAssayFilesLoading(false);
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
    }

    // Helper method for dynamic scrolling, grabs data when scrolling up
    function getDataUp () {
      if (vm.firstPage > 0) {
        vm.firstPage--;
      }

      vm.filesParam.offset = vm.firstPage * vm.rowCount;
      vm.filesParam.limit = vm.rowCount;
      var promise = $q.defer();
      filesLoadingService.setIsAssayFilesLoading(true);
      fileBrowserFactory.getAssayFiles(vm.filesParam)
        .then(function () {
          vm.gridApi.infiniteScroll.saveScrollPercentage();
          vm.gridOptions.data = fileBrowserFactory.assayFiles;
          filesLoadingService.setIsAssayFilesLoading(false);
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
    }

    // Ui-grid methods for catching grid events
    function gridRegister (gridApi) {
      // prevent scoping issues, after reset or initial generation
      if (!vm.gridApi) {
        vm.gridApi = gridApi;
        gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
        gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);

        // Sort events
        vm.gridApi.core.on.sortChanged(null, vm.sortChanged);
        vm.sortChanged(vm.gridApi.grid, [vm.gridOptions.columnDefs[1]]);
      }
    }

    /** vm method to open the selection popover and disable all popovers, so
     * only one shows at a time. Needed in the ctrl due to ui-grid template.
     * @param nodeUuid
     */
    function openSelectionPopover (nodeRow) {
      if (_.isEmpty(nodesService.activeNodeRow)) {
        // active nodes are cleared after popovers are closed
        angular.copy(nodeRow, nodesService.activeNodeRow);
        vm.activeNodeRow = nodesService.activeNodeRow;
        angular.element('#' + nodeRow.uuid).popover('show');
        angular.element('.ui-grid-selection-row-header-buttons').popover('disable');
      } else {
        // user selects a different row, triggers closing all open popovers
        fileService.hideNodePopover = true;
      }
    }

    /**
     * A main method which grabs all the data set nodes, attributes, and updates
     * ui-grid params.
     */
    function refreshAssayFiles () {
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
    }

    // helper method, upon refresh/load add fields to select data objs from query
    function refreshSelectedFieldFromQuery (_attributeObj) {
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
    }

    // Reset the data, selected rows, and scroll position in the grid
    function reset () {
      vm.firstPage = 0;
      vm.lastPage = 0;
      // reset service data
      angular.copy([], fileBrowserFactory.assayFiles);

      // turn off the infinite scroll handling up and down
      if (typeof vm.gridApi !== 'undefined') {
        vm.gridApi.infiniteScroll.setScrollDirections(false, false);

        vm.refreshAssayFiles(vm.filesParam).then(function () {
          $timeout(function () {
            // timeout needed allows digest cycle to complete,and grid to ingest the data
            vm.gridApi.infiniteScroll.resetScroll(vm.firstPage > 0, vm.lastPage < vm.totalPages);
            vm.nodeSelectCollection = fileService.nodeSelectCollection;
            resetGridService.setResetGridFlag(false);
          });
        });
      }
    }

    /**
     * Generates sort param for api call from ui-grid response and calls grid
     * reset
     * @param {obj} grid - ui-grid obj
     * @param {string} sortColumns - string defining sort direction
     */
    function sortChanged (grid, sortColumns) {
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
    }

    // View method which toggles the collapsedToolPanel variable.
    // Needed to resize UI-Grid and alternate text in button.
    function toggleToolPanel () {
      if (toolService.isToolPanelCollapsed) {
        toolService.isToolPanelCollapsed = false;
        vm.collapsedToolPanel = toolService.isToolPanelCollapsed;
      } else {
        toolService.isToolPanelCollapsed = true;
        vm.collapsedToolPanel = toolService.isToolPanelCollapsed;
      }
    }

    // checks url for params to update the filter
    function updateFiltersFromUrlQuery () {
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
    }

    // Helper method which check for any data updates during soft loads (tabbing)
    function checkAndUpdateGridData () {
      fileBrowserFactory.getAssayFiles(vm.filesParam)
        .then(function () {
          if (vm.assayFilesTotal !== fileBrowserFactory.assayFilesTotalItems.count) {
            if (vm.assayFilesTotal < maxFileRequest) {
              vm.gridOptions.data = fileBrowserFactory.assayFiles;
            }
            vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
          }
        });
    }

    /**
     * Checks whether the page requires data (hard/soft page load) and
     * updates data, filters, ui-grid selections, and url query
     */
    function initializeDataOnPageLoad () {
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
        // updates view model's selected attribute filters
        angular.forEach(
          selectedFilterService.attributeSelectedFields,
          function (fieldArr, attributeInternalName) {
            for (var i = 0; i < fieldArr.length; i++) {
              if (_.isEmpty(vm.uiSelectedFields)) {
                vm.uiSelectedFields[attributeInternalName] = {};
              }
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
        }, 0);
        // updates params object
        if (Object.keys($location.search()).length > 0) {
          vm.updateFiltersFromUrlQuery();
        }
        checkAndUpdateGridData();
      }
    }

    // Helper method: toggles the tool related columns, selection & input groups
    function toggleToolColumn () {
      if (_.isEmpty(toolService.selectedTool) &&
        fileBrowserFactory.customColumnNames[0].visible) {
        // Explicitly toggle to avoid a bug when data doesn't show on tabbing
        fileBrowserFactory.customColumnNames[0].visible = false;
        fileBrowserFactory.customColumnNames[1].visible = false;
        vm.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
      } else if (!_.isEmpty(toolService.selectedTool) &&
        !fileBrowserFactory.customColumnNames[0].visible) {
        fileBrowserFactory.customColumnNames[0].visible = true;
        fileBrowserFactory.customColumnNames[1].visible = true;
        vm.gridApi.core.notifyDataChange(uiGridConstants.dataChange.COLUMN);
      }
    }

    /*
     * -----------------------------------------------------------------------------
     * Watchers
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

    // when a new row is selected/deselected
    $scope.$watch(
      function () {
        return nodesService.activeNodeRow;
      },
      function () {
        vm.activeNodeRow = nodesService.activeNodeRow;
      }
    );

    // when a node is added/removed from a tool input group
    $scope.$watchCollection(
      function () {
        return fileService.nodeSelectCollection;
      },
      function () {
        vm.nodeSelectCollection = fileService.nodeSelectCollection;
        vm.inputFileTypeColor = fileService.inputFileTypeColor;
      }
    );

    // only show the selection and input group column when a tool is selected
    $scope.$watchCollection(
      function () {
        return toolService.selectedTool;
      },
      function () {
        if (fileBrowserFactory.customColumnNames.length > 0) {
          toggleToolColumn();
        }
      }
    );
  }
})();
