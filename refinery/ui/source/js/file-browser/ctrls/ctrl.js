'use strict';

function FileBrowserCtrl (
  $scope,
  $location,
  uiGridConstants,
  fileBrowserFactory,
  resetGridService,
  isOwnerService,
  selectedNodesService,
  $timeout,
  $q,
  $log,
  $window,
  _
  ) {
  var vm = this;
  vm.assayFiles = [];
  vm.assayAttributes = [];
  vm.attributeFilter = [];
  vm.analysisFilter = [];
  vm.filesParam = {
    uuid: $window.externalAssayUuid
  };
  vm.gridApi = undefined;

  // Ui-grid parameters
  vm.customColumnName = [];
  vm.queryKeys = Object.keys($location.search());
  vm.selectedField = {};
  vm.selectedFieldList = {};
  vm.selectNodesCount = 0;
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
  // Total file size in data set, sent from api
  vm.assayFilesTotal = 1;
  // variables supporting dynamic scrolling
  vm.firstPage = 0;
  vm.lastPage = 0;
  vm.rowCount = 100;
  vm.totalPages = 1;
  vm.cachePages = 2;
  vm.counter = 0;

  vm.refreshAssayFiles = function () {
    vm.filesParam.offset = vm.lastPage * vm.rowCount;
    vm.filesParam.limit = vm.rowCount;

    var promise = $q.defer();
    fileBrowserFactory.getAssayFiles(vm.filesParam).then(function () {
      // Grabbing 100 files per request, keeping max of 300 at a time
      vm.assayFiles = vm.assayFiles.concat(fileBrowserFactory.assayFiles);
      // Ui-grid rows generated from assay files
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
    // Grid only needs to reset if filters are applied
    if (Object.keys(vm.selectedFieldList).length > 0) {
      vm.reset();
    }
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
    // prevent scoping issues, after reset or initial generation
    if (!vm.gridApi) {
      vm.gridApi = gridApi;
       // Infinite Grid Load
      gridApi.infiniteScroll.on.needLoadMoreData(null, vm.getDataDown);
      gridApi.infiniteScroll.on.needLoadMoreDataTop(null, vm.getDataUp);

      // Sort events
      vm.gridApi.core.on.sortChanged(null, vm.sortChanged);
      vm.sortChanged(vm.gridApi.grid, [vm.gridOptions.columnDefs[1]]);

      // Checkbox selection events
      vm.gridApi.selection.on.rowSelectionChanged(null, function (row) {
        // When selected All, watching the deselect events for complement nodes
        if (selectedNodesService.selectedAllFlag) {
          selectedNodesService.setComplementSeletedNodes(row);
          vm.selectNodesCount = vm.selectNodesCount - 1;
        } else {
          console.log('in the select row event');
          console.log(row);
          // add or remove row to list
          selectedNodesService.setSelectedNodes(row);
          // When node group contains uuids not yet loaded in the ui, set
          // selectNodesCount from nodegroup nodes length offseted by
          // the unselected visible rows
          if (selectedNodesService.selectedNodeUuidsFromNodeGroup.length >
            selectedNodesService.selectedNodes.length) {
            vm.selectNodesCount = selectedNodesService.selectedNodeUuidsFromNodeGroup.length -
            vm.gridApi.grid.rows.length + selectedNodesService.selectedNodes.length;
          } else {
            vm.selectNodesCount = selectedNodesService.selectedNodes.length;
          }
        }
      });

      // Event only occurs when checkbox is selected/deselected.
      vm.gridApi.selection.on.rowSelectionChangedBatch(null, function (eventRows) {
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

  // Helper method to select/deselect rows programmically after dynamic
  // scroll adds more data
  var correctRowSelectionInUI = function () {
    if (selectedNodesService.selectedAllFlag) {
      vm.gridApi.selection.selectAllRows();
      // ensure complement nodes are deselected
      angular.forEach(selectedNodesService.complementSelectedNodes, function (nodeRow) {
        if (nodeRow.isSelected) {
          vm.gridApi.selection.unSelectRow(nodeRow.entity);
        }
      });
    } else if (selectedNodesService.selectedNodeUuidsFromNodeGroup.length > 0) {
      vm.getGridRowsFromUuids(selectedNodesService.selectedNodeUuidsFromNodeGroup);
      vm.setGridSelectedRows();
    } else if (selectedNodesService.selectedNodes.length > 0) {
      vm.setGridSelectedRows();
    }
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

  // Heloper function, Gets ui-grid objects based on the node-group uuidsList
  vm.getGridRowsFromUuids = function (uuidsList) {
    angular.forEach(vm.gridApi.grid.rows, function (row) {
      console.log('in get Grid Rows from uuids');
      if (uuidsList.indexOf(row.entity.uuid) > -1) {
        console.log(row);
        selectedNodesService.setSelectedNodes(row);
      }
    });
    vm.selectNodesCount = selectedNodesService.selectedNodes.length;
  };

  // Helper function: select rows on the ui-grid
  vm.setGridSelectedRows = function () {
    // If user scrolls quickly, there could be a delay for selected items
    angular.forEach(vm.gridApi.grid.rows, function (gridRow) {
      if (selectedNodesService.selectedNodeUuids.indexOf(gridRow.entity.uuid) > -1) {
        console.log('in grid selected rows');
        vm.gridApi.selection.selectRow(gridRow.entity);
      }
    });
  };

  // Reset the data, selected rows, and scroll position in the grid
  vm.reset = function () {
    vm.firstPage = 0;
    vm.lastPage = 0;
    console.log('in reset');

    // turn off the infinite scroll handling up and down
    if (typeof vm.gridApi !== 'undefined') {
      vm.gridApi.infiniteScroll.setScrollDirections(false, false);

      vm.assayFiles = [];
      vm.selectNodesCount = 0;
      console.log('selected nodes in reset');
      console.log(selectedNodesService.selectedNodes);

      vm.refreshAssayFiles().then(function () {
        $timeout(function () {
        // timeout needed to allow digest cycle to complete,and grid to finish ingesting the data
          vm.gridApi.infiniteScroll.resetScroll(vm.firstPage > 0, vm.lastPage < vm.totalPages);
          resetGridService.setResetGridFlag(false);
          // Select rows either from node group lists or previously selected
          if (selectedNodesService.selectedNodeUuidsFromNodeGroup.length > 0) {
            vm.getGridRowsFromUuids(selectedNodesService.selectedNodeUuidsFromNodeGroup);
            vm.setGridSelectedRows();
          } else if (selectedNodesService.selectedNodes.length > 0) {
            console.log('else if selectedNodes');
            vm.setGridSelectedRows();
          } else {
            console.log('clearing');
            vm.gridApi.selection.clearSelectedRows();
          }
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
      var colProperty = {
        name: columnName,
        width: columnWidth + '%',
        field: attribute.internal_name,
        cellTooltip: true,
        enableHiding: false
      };
      if (columnName === 'Url') {
        // Url requires a custom template for downloading links
        vm.customColumnName.push(vm.setCustomUrlColumnDef(columnName));
      } else if (columnName === 'Analysis Group') {
        // Analysis requires a custom template for filtering -1 entries
        var _cellTemplate = '<div class="ngCellText text-align-center"' +
        'ng-class="col.colIndex()">{{COL_FIELD |' +
          ' analysisGroupNegativeOneWithNA: "Analysis Group"}}</div>';
        colProperty.cellTemplate = _cellTemplate;
        vm.customColumnName.push(colProperty);
      } else {
        vm.customColumnName.push(colProperty);
      }
    });
    vm.gridOptions.columnDefs = vm.customColumnName;
  };

  // Helper method for grabbing the internal name, in fastqc viewer template
  var grabAnalysisInternalName = function (arrayOfObj) {
    var internalName = '';
    for (var i = 0; i < arrayOfObj.length; i ++) {
      if (arrayOfObj[i].display_name === 'Analysis') {
        internalName = arrayOfObj[i].internal_name;
        break;
      }
    }
    return internalName;
  };

  // File download column require unique template and fields.
  vm.setCustomUrlColumnDef = function (_columnName) {
    var internalName = grabAnalysisInternalName(vm.assayAttributes);
    var _cellTemplate = '<div class="ngCellText text-align-center"' +
          'ng-class="col.colIndex()">' +
          '<div ng-if="COL_FIELD" title="Download File \{{COL_FIELD}}\">' +
          '<a href="{{COL_FIELD}}" target="_blank">' +
          '<i class="fa fa-arrow-circle-o-down"></i></a>' +
          '<span class="fastqc-viewer" ' +
          'ng-if="row.entity.Url.indexOf(' + "'fastqc_results'" + ') >= 0">' +
          '&nbsp;<a title="View FastQC Result"' +
          ' href="/fastqc_viewer/#/\{{row.entity.' + internalName + '}}\">' +
          '<i class="fa fa-bar-chart-o"></i></a>' +
          '</span></div>' +
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
      cellTemplate: _cellTemplate
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
    'selectedNodesService',
    '$timeout',
    '$q',
    '$log',
    '$window',
    '_',
    FileBrowserCtrl
  ]);

