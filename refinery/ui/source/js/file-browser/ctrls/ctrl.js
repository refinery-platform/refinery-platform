/**
 * File Browser Ctrl
 * @namespace FileBrowserCtrl
 * @desc Main ctrl which handles the files tab (main) view and also
 * generates the ui-grid table.
 * @memberOf refineryFileBrowser
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('FileBrowserCtrl', FileBrowserCtrl);

  FileBrowserCtrl.$inject = [
    '$log',
    '$q',
    '$scope',
    '$timeout',
    '$uibModal',
    '$window',
    'uiGridConstants',
    '_',
    'assayFiltersService',
    'dataSetPermsService',
    'fileBrowserFactory',
    'fileBrowserSettings',
    'fileParamService',
    'filesLoadingService',
    'fileRelationshipService',
    'isOwnerService',
    'resetGridService',
    'selectedFilterService',
    'activeNodeService',
    'toolSelectService'
  ];

  function FileBrowserCtrl (
    $log,
    $q,
    $scope,
    $timeout,
    $uibModal,
    $window,
    uiGridConstants,
    _,
    assayFiltersService,
    dataSetPermsService,
    fileBrowserFactory,
    fileBrowserSettings,
    fileParamService,
    filesLoadingService,
    fileRelationshipService,
    isOwnerService,
    resetGridService,
    selectedFilterService,
    activeNodeService,
    toolSelectService
  ) {
    var dataSetUuid = $window.dataSetUuid;
    var fileService = fileRelationshipService;
    var maxFileRequest = fileBrowserSettings.maxFileRequest;
    var nodesService = activeNodeService;
    var paramService = fileParamService;
    var permsService = dataSetPermsService;
    var toolService = toolSelectService;
    var vm = this;
    vm.activeNodeRow = nodesService.activeNodeRow;
    vm.analysisFilter = assayFiltersService.analysisFilter;
    // attribute list from api
    vm.assayAttributes = fileBrowserFactory.assayAttributes;
    vm.assayFilesTotal = fileBrowserFactory.assayFilesTotalItems.count;
    // objs used by ui to generate filters
    vm.attributeFilter = assayFiltersService.attributeFilter;
    // variable supporting ui-grid dynamic scrolling
    vm.cachePages = 2;
    vm.checkDataLength = checkDataLength;
    vm.collapsedToolPanel = toolService.isToolPanelCollapsed;
    vm.currentTypes = fileService.currentTypes;
    vm.firstPage = 0;
    vm.getDataDown = getDataDown;
    vm.getDataUp = getDataUp;
    vm.gridApi = undefined; // avoids duplicate grid generation
    // Main ui-grid options
    vm.gridOptions = {
      appScopeProvider: vm,
      columnDefs: fileBrowserFactory.customColumnNames,
      data: fileBrowserFactory.assayFiles,
      gridFooterTemplate: '<rp-is-assay-files-loading></rp-is-assay-files-loading>',
      infiniteScrollRowsFromEnd: 40,
      infiniteScrollUp: true,
      infiniteScrollDown: true,
      multiSelect: true,
      onRegisterApi: gridRegister,
      rowHeight: 35,
      rowTemplate: '<rp-ui-grid-row-template></rp-ui-grid-row-template>',
      selectionRowHeaderWidth: 35,
      showGridFooter: true,
      useExternalSorting: true
    };
    vm.isOwner = false;
    vm.inputFileTypeColor = fileService.inputFileTypeColor;
    vm.lastPage = 0;  // variable supporting ui-grid dynamic scrolling
    vm.nodeSelectCollection = fileService.nodeSelectCollection;
    vm.openPermissionEditor = openPermissionEditor;
    vm.openSelectionPopover = openSelectionPopover;
    vm.refreshAssayFiles = refreshAssayFiles;
    vm.reset = reset;
    vm.rowCount = maxFileRequest;
    vm.sortChanged = sortChanged;
    vm.toggleToolPanel = toggleToolPanel;
    vm.totalPages = 1;  // variable supporting ui-grid dynamic scrolling
    vm.userPerms = permsService.userPerms;

    activate();
    /*
     * -----------------------------------------------------------------------------
     * Methods
     * -----------------------------------------------------------------------------
     */
    function activate () {
      // Ensure data owner or group permission to modify (run tools)
      checkDataSetOwnership();
      // initialize the dataset and updates ui-grid selection, filters, and url
      initializeDataOnPageLoad();
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
      paramService.fileParam.offset = vm.lastPage * vm.rowCount;
      paramService.fileParam.limit = vm.rowCount;
      var promise = $q.defer();
      filesLoadingService.setIsAssayFilesLoading(true);
      fileBrowserFactory.getAssayFiles(paramService.fileParam)
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

      paramService.fileParam.offset = vm.firstPage * vm.rowCount;
      paramService.fileParam.limit = vm.rowCount;
      var promise = $q.defer();
      filesLoadingService.setIsAssayFilesLoading(true);
      fileBrowserFactory.getAssayFiles(paramService.fileParam)
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

    /** view method to open the permissions modal component, in commons
     *  directive*/
    function openPermissionEditor () {
      $uibModal.open({
        component: 'rpPermissionEditorModal',
        resolve: {
          config: function () {
            return {
              model: 'data_sets',
              uuid: dataSetUuid
            };
          }
        }
      });
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
      paramService.fileParam.offset = vm.lastPage * vm.rowCount;
      paramService.fileParam.limit = vm.rowCount;

      var promise = $q.defer();
      fileBrowserFactory.getAssayFiles(paramService.fileParam).then(function () {
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
        vm.attributeFilter = assayFiltersService.attributeFilter;
        vm.analysisFilter = assayFiltersService.analysisFilter;
        promise.resolve();
      }, function (error) {
        $log.error(error);
      });
      return promise.promise;
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

        vm.refreshAssayFiles(paramService.fileParam).then(function () {
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
            paramService.fileParam.sort = sortColumns[0].field + ' asc';
            vm.reset();
            break;
          case uiGridConstants.DESC:
            paramService.fileParam.sort = sortColumns[0].field + ' desc';
            vm.reset();
            break;
          default:
            vm.reset();
            break;
        }
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

    // View method which toggles the collapsedToolPanel variable.
    // Needed to resize UI-Grid and alternate text in button.
    function toggleToolPanel () {
      if (toolService.isToolPanelCollapsed) {
        toolService.isToolPanelCollapsed = false;
      } else {
        toolService.isToolPanelCollapsed = true;
      }
      // resize window with toggling
      vm.collapsedToolPanel = toolService.isToolPanelCollapsed;
      vm.gridApi.core.handleWindowResize();
    }

    // Helper method which check for any data updates during soft loads (tabbing)
    function checkAndUpdateGridData () {
      fileBrowserFactory.getAssayFiles(paramService.fileParam)
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
        vm.refreshAssayFiles();
        // Tabbing does not require api response wait and update query in URL
      } else {
        checkAndUpdateGridData();
      }
    }

    /*
     * -----------------------------------------------------------------------------
     * Watchers
     * -----------------------------------------------------------------------------
     */

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
        vm.currentTypes = fileService.currentTypes;
        if (fileBrowserFactory.customColumnNames.length > 0) {
          toggleToolColumn();
        }
      }
    );

    $scope.$watch(
        function () {
          return permsService.userPerms;
        },
        function () {
          vm.userPerms = permsService.userPerms;
        }
    );
  }
})();
