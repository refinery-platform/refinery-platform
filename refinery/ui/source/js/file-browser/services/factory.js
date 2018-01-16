(function () {
  'use strict';

  angular
  .module('refineryFileBrowser')
  .factory('fileBrowserFactory', fileBrowserFactory);

  fileBrowserFactory.$inject = [
    '$log',
    '_',
    '$window',
    'assayAttributeService',
    'assayFileService',
    'assayFiltersService',
    'fileBrowserSettings',
    'nodeService',
    'selectedFilterService',
    'toolSelectService'
  ];

  function fileBrowserFactory (
    $log,
    _,
    $window,
    assayAttributeService,
    assayFileService,
    assayFiltersService,
    fileBrowserSettings,
    nodeService,
    selectedFilterService,
    toolSelectService
    ) {
    // assayfiles has max 300 rows, ctrl adds/subtracts rows to maintain count
    var assayFiles = [];
    var assayAttributes = [];
    var assayAttributeOrder = [];
    var assayFilesTotalItems = {};
    var customColumnNames = [];
    var csrfToken = $window.csrf_token;
    var maxFileRequest = fileBrowserSettings.maxFileRequest;

    var service = {
      assayAttributes: assayAttributes,
      assayAttributeOrder: assayAttributeOrder,
      assayFiles: assayFiles,
      assayFilesTotalItems: assayFilesTotalItems,
      customColumnNames: customColumnNames,
      createColumnDefs: createColumnDefs,
      getAssayFiles: getAssayFiles,
      getAssayAttributeOrder: getAssayAttributeOrder,
      postAssayAttributeOrder: postAssayAttributeOrder,
      resetAssayFiles: resetAssayFiles,
      trimAssayFiles: trimAssayFiles
    };

    return service;

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

        // populates the ui-grid columns variable
    function createColumnDefs () {
      var tempCustomColumnNames = [];

      var totalChars = assayAttributes.reduce(function (previousValue, facetObj) {
        return previousValue + String(facetObj.display_name).length;
      }, 0);

      assayAttributes.forEach(function (attribute) {
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
        if (columnName === 'Download') {
          // Url requires a custom template for downloading links
          tempCustomColumnNames.push(setCustomUrlColumn(attribute));
        } else if (columnName === 'Input Groups') {
          // Input Groups requires a custom template for downloading links
          tempCustomColumnNames.push(setCustomInputGroupsColumn(columnName));
        } else if (columnName === 'Selection') {
          // Selection requires a custom template for downloading links
          tempCustomColumnNames.push(setCustomSelectColumn(columnName));
        } else if (columnName === 'Analysis Group') {
          // Analysis requires a custom template for filtering -1 entries
          var _cellTemplate = '<div class="ngCellText text-align-center"' +
          'ng-class="col.colIndex()">{{COL_FIELD |' +
            ' analysisGroupNegativeOneWithNA: "Analysis Group"}}</div>';
          colProperty.cellTemplate = _cellTemplate;
          tempCustomColumnNames.push(colProperty);
        } else {
          tempCustomColumnNames.push(colProperty);
        }
      });
      angular.copy(tempCustomColumnNames, customColumnNames);
      return customColumnNames;
    }

    // Helper method which makes display_names uniquey by adding attribute_type
    function createUniqueDisplayNames (outInd) {
      for (var inInd = outInd + 1; inInd < assayAttributes.length; inInd++) {
        if (assayAttributes[outInd].display_name === assayAttributes[inInd].display_name) {
          assayAttributes[outInd].display_name = assayAttributes[outInd]
              .display_name + '-' + assayAttributes[outInd].attribute_type;
          assayAttributes[inInd].display_name = assayAttributes[inInd]
              .display_name + '-' + assayAttributes[inInd].attribute_type;
        }
      }
    }

    // In an array of objects, removes an object with a display_name of 'uuid'
    function hideUuidAttribute (arrayOfObjs) {
      for (var i = arrayOfObjs.length - 1; i >= 0; i--) {
        if (arrayOfObjs[i].display_name === 'uuid') {
          arrayOfObjs.splice(i, 1);
          break;
        }
      }
      return arrayOfObjs;
    }


    function getAssayFiles (unencodeParams, scrollDirection) {
      var params = {};
      var additionalAssayFiles = [];
      angular.copy(unencodeParams, params);

      // encodes all field names to avoid issues with escape characters.
      if (typeof params.filter_attribute !== 'undefined') {
        params.filter_attribute = selectedFilterService
          .encodeAttributeFields(params.filter_attribute);
      }

      var assayFile = assayFileService.query(params);
      assayFile.$promise.then(function (response) {
        /** Api returns uuid field, which is needed to select rows. It should be
         *  hidden in the data table first **/
        var culledAttributes = hideUuidAttribute(response.attributes);
        angular.copy(culledAttributes, assayAttributes);

       // Add file_download column first
        for (var i = 0; i < assayAttributes.length; i++) {
          if (assayAttributes[i].internal_name === 'REFINERY_DOWNLOAD_URL_s') {
            // remove from current position and add to the front
            assayAttributes.splice(0, 0, (assayAttributes.splice(i, 1)[0]));
            break;
          }
        }
        assayAttributes.unshift({ display_name: 'Input Groups', internal_name: 'InputGroups' });
        assayAttributes.unshift({ display_name: 'Selection', internal_name: 'Selection' });

        // some attributes will be duplicate in different fields, duplicate
        // column names will throw an error. This prevents duplicates
        for (var ind = 0; ind < assayAttributes.length; ind++) {
          createUniqueDisplayNames(ind);
        }
        angular.copy(response.nodes, additionalAssayFiles);
        assayFilesTotalItems.count = response.nodes_count;

        // Not concat data when under minimun file order, replace assay files
        if (assayFilesTotalItems.count < maxFileRequest || params.offset === 0) {
          angular.copy(additionalAssayFiles, assayFiles);
        } else if (scrollDirection === 'up') {
          angular.copy(additionalAssayFiles.concat(assayFiles), assayFiles);
        } else {
          angular.copy(assayFiles.concat(additionalAssayFiles), assayFiles);
        }
        assayFiltersService.generateFilters(response.attributes, response.facet_field_counts);
      }, function (error) {
        $log.error(error);
      });
      return assayFile.$promise;
    }

    function getAssayAttributeOrder (uuid) {
      var params = {
        uuid: uuid
      };

      var assayAttribute = assayAttributeService.query(params);
      assayAttribute.$promise.then(function (response) {
        var sortedResponse = sortArrayOfObj(response);
        angular.copy(sortedResponse, assayAttributeOrder);
      }, function (error) {
        $log.error(error);
      });
      return assayAttribute.$promise;
    }

    function postAssayAttributeOrder (attributeParam) {
      var assayUuid = $window.externalAssayUuid;
      var dataObj = {
        csrfmiddlewaretoken: csrfToken,
        uuid: assayUuid,
        solr_field: attributeParam.solr_field,
        is_exposed: attributeParam.is_exposed,
        is_active: attributeParam.is_active,
        is_facet: attributeParam.is_facet,
        rank: attributeParam.rank
      };

      var assayAttributeUpdate = assayAttributeService.update(dataObj);
      assayAttributeUpdate.$promise.then(function (response) {
        for (var ind = 0; ind < assayAttributeOrder.length; ind++) {
          if (assayAttributeOrder[ind].solr_field === response.solr_field) {
            angular.copy(response, assayAttributeOrder[ind]);
            break;
          }
        }
      }, function (error) {
        $log.error(error);
      });
      return assayAttributeUpdate.$promise;
    }

    function resetAssayFiles () {
      assayFiles = [];
    }

    /**
     * Helper method for input groups column, requires unique template & fields.
     * @param {string} _columnName - column name
     */
    function setCustomInputGroupsColumn (_columnName) {
      var _cellTemplate = '<rp-input-groups-column-template>' +
        '</rp-input-groups-column-template>';

      var isToolSelected = !_.isEmpty(toolSelectService.selectedTool);

      return {
        name: _columnName,
        field: _columnName,
        width: 11 + '%',
        displayName: 'Input Groups',
        enableFiltering: false,
        enableSorting: false,
        enableColumnMenu: false,
        enableColumnResizing: true,
        pinnedLeft: true,
        cellTemplate: _cellTemplate,
        visible: isToolSelected
      };
    }
     /**
     * Helper method for select column, requires unique template & fields.
     * @param {string} _columnName - column name
     */
    function setCustomSelectColumn (columnName) {
      var cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents">' +
          '<a rp-node-selection-popover title="Select Tool Input"' +
          'ng-click="grid.appScope.openSelectionPopover(row.entity)"' +
          'id="{{row.entity.uuid}}">' +
          '<div class="full-size ui-grid-selection-row-header-buttons solidText">' +
          '<i class="fa fa-arrow-right" aria-hidden="true">' +
          '</i></div></a></div>';

      var isToolSelected = !_.isEmpty(toolSelectService.selectedTool);

      return {
        name: columnName,
        field: columnName,
        cellTooltip: false,
        width: 4 + '%',
        displayName: '',
        enableFiltering: false,
        enableSorting: false,
        enableColumnMenu: false,
        enableColumnResizing: true,
        pinnedLeft: true,
        cellTemplate: cellTemplate,
        visible: isToolSelected
      };
    }

     /**
     * Helper method for file download column, requires unique template & fields.
     * @param {string} _columnName - column name
     */
    function setCustomUrlColumn (urlAttribute) {
      var _cellTemplate = '<div class="ngCellText text-align-center ui-grid-cell-contents"' +
            'ng-class="col.colIndex()">' +
            '<div ng-if="COL_FIELD == \'PENDING\'"  ' +
            'title="Importing file in progress.">' +
            '<i class="fa fa-clock-o"></i></div>' +
            '<div ng-if="COL_FIELD != \'PENDING\' ' +
            '&& COL_FIELD != \'N/A\'" ' +
            'title="Download File \{{COL_FIELD}}\">' +
            '<a href="{{COL_FIELD}}" target="_blank">' +
            '<i class="fa fa-arrow-circle-o-down"></i></a></div>' +
            '<div ng-if="COL_FIELD == \'N/A\'" ' +
            'title="File not available for download">' +
            '<i class="fa fa-bolt"></i>' +
            '</div>' +
            '</div>';

      return {
        name: urlAttribute.internal_name,
        field: urlAttribute.internal_name,
        cellTooltip: true,
        width: 4 + '%',
        displayName: '',
        enableFiltering: false,
        enableSorting: false,
        enableColumnMenu: false,
        enableColumnResizing: false,
        cellTemplate: _cellTemplate
      };
    }

    // Method sorts and array of objects based on a rank field.
    function sortArrayOfObj (_arrayOfObjs) {
      _arrayOfObjs.sort(function (a, b) {
        if (a.rank > b.rank) {
          return 1;
        }
        if (a.rank < b.rank) {
          return -1;
        }
        return 0;
      });
      return _arrayOfObjs;
    }

    // helper method to trim assayFiles data for caching purposes
    function trimAssayFiles (sliceCount, startInd) {
      if (startInd === undefined) {
        angular.copy(assayFiles.slice(sliceCount), assayFiles);
      } else {
        angular.copy(assayFiles.slice(startInd, sliceCount), assayFiles);
      }
    }
  }
})();
