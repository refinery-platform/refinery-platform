'use strict';

function fileBrowserFactory (
  $log,
  _,
  $window,
  assayAttributeService,
  assayFileService,
  fileBrowserSettings,
  nodeGroupService,
  nodeService,
  selectedFilterService
  ) {
  // assayfiles has max 300 rows, ctrl adds/subtracts rows to maintain count
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  var attributeFilter = {};
  var analysisFilter = {};
  var assayFilesTotalItems = {};
  var customColumnNames = [];
  var nodeUrl = {};
  var nodeGroupList = [];
  var csrfToken = $window.csrf_token;
  var maxFileRequest = fileBrowserSettings.maxFileRequest;

  // Helper method which makes display_names uniquey by adding attribute_type
  var createUniqueDisplayNames = function (outInd) {
    for (var inInd = outInd + 1; inInd < assayAttributes.length; inInd++) {
      if (assayAttributes[outInd].display_name === assayAttributes[inInd].display_name) {
        assayAttributes[outInd].display_name = assayAttributes[outInd]
            .display_name + '-' + assayAttributes[outInd].attribute_type;
        assayAttributes[inInd].display_name = assayAttributes[inInd]
            .display_name + '-' + assayAttributes[inInd].attribute_type;
      }
    }
  };

  /** Configures the attribute and analysis filter data by adding the display
   * name from the assay files attributes display_name. The attributes returns
   * all fields, while the counts will return only the faceted fields. **/
  var generateFilters = function (attributes, facetCounts) {
    // resets the attribute filters, which can be changed by owners
    var outAttributeFilter = {};
    var outAnalysisFilter = {};
    attributes.forEach(function (facetObj) {
      if (facetCounts[facetObj.internal_name] !== undefined) {
        var facetObjCount = facetCounts[facetObj.internal_name];
        // for filtering out (only) attributes with only 1 field
        var facetObjCountMinLen = Object.keys(facetObjCount).length > 1;

        if (facetObjCountMinLen && facetObj.display_name !== 'Analysis') {
          outAttributeFilter[facetObj.display_name] = {
            facetObj: facetObjCount,
            internal_name: facetObj.internal_name
          };
        } else if (facetObjCount && facetObj.display_name === 'Analysis') {
          outAnalysisFilter[facetObj.display_name] = {
            facetObj: facetObjCount,
            internal_name: facetObj.internal_name
          };
        }
      }
    });

    return {
      attributeFilter: outAttributeFilter,
      analysisFilter: outAnalysisFilter
    };
  };

  var getNodeDetails = function (nodeUuid) {
    var params = {
      uuid: nodeUuid
    };

    var nodeFile = nodeService.query(params);
    nodeFile.$promise.then(function (response) {
      nodeUrl = response.file_url;
    });
    return nodeFile.$promise;
  };

  var getNodeGroupList = function (assayUuid) {
    var params = {
      assay: assayUuid
    };

    var nodeGroups = nodeGroupService.query(params);
    nodeGroups.$promise.then(function (response) {
      angular.copy(response, nodeGroupList);
    });
    return nodeGroups.$promise;
  };

  var createNodeGroup = function (params) {
    var nodeGroup = nodeGroupService.save(params);
    return nodeGroup.$promise;
  };

  // Adds the file_url to the assay files array
  var addNodeDetailtoAssayFiles = function () {
    angular.forEach(assayFiles, function (facetObj) {
      getNodeDetails(facetObj.uuid).then(function () {
        facetObj.Url = nodeUrl;
      });
    });
  };

  // In an array of objects, removes an object with a display_name of 'uuid'
  var hideUuidAttribute = function (arrayOfObjs) {
    for (var i = arrayOfObjs.length - 1; i >= 0; i--) {
      if (arrayOfObjs[i].display_name === 'uuid') {
        arrayOfObjs.splice(i, 1);
        break;
      }
    }
    return arrayOfObjs;
  };

  // Method sorts and array of objects based on a rank field.
  var sortArrayOfObj = function (_arrayOfObjs) {
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
  };

  var resetAssayFiles = function () {
    assayFiles = [];
  };

  var getAssayFiles = function (unencodeParams, scrollDirection) {
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
      /** Api returns uuid field, which is needed to retrieve the
       *  download file_url for nodeset api. It should be hidden in the data
       *  table first **/
      var culledAttributes = hideUuidAttribute(response.attributes);
      angular.copy(culledAttributes, assayAttributes);
      // Add file_download column first
      assayAttributes.unshift({ display_name: 'Url', internal_name: 'Url' });
      // some attributes will be duplicate in different fields, duplicate
      // column names will throw an error. This prevents duplicates
      for (var ind = 0; ind < assayAttributes.length; ind++) {
        createUniqueDisplayNames(ind);
      }
      angular.copy(response.nodes, additionalAssayFiles);
      assayFilesTotalItems.count = response.nodes_count;

      // Not concat data when under minimun file order, replace assay files
      if (assayFilesTotalItems.count < maxFileRequest && params.offset === 0) {
        angular.copy(additionalAssayFiles, assayFiles);
      } else if (scrollDirection === 'up') {
        angular.copy(additionalAssayFiles.concat(assayFiles), assayFiles);
      } else {
        angular.copy(assayFiles.concat(additionalAssayFiles), assayFiles);
      }
      addNodeDetailtoAssayFiles();
      var filterObj = generateFilters(response.attributes, response.facet_field_counts);
      angular.copy(filterObj.attributeFilter, attributeFilter);
      angular.copy(filterObj.analysisFilter, analysisFilter);
    }, function (error) {
      $log.error(error);
    });
    return assayFile.$promise;
  };

  var getAssayAttributeOrder = function (uuid) {
    var params = {
      uuid: uuid
    };

    var assayAttribute = assayAttributeService.query(params);
    assayAttribute.$promise.then(function (response) {
      var culledResponseData = hideUuidAttribute(response);
      var sortedResponse = sortArrayOfObj(culledResponseData);
      angular.copy(sortedResponse, assayAttributeOrder);
    }, function (error) {
      $log.error(error);
    });
    return assayAttribute.$promise;
  };

  var postAssayAttributeOrder = function (attributeParam) {
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
  };

  /**
   * Helper method for grabbing the internal name, in fastqc viewer template
   * @param {obj} arrayOfObj - ui-grid data obj
   */
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

   /**
   * Helper method for file download column, requires unique template & fields.
   * @param {string} _columnName - column name
   */
  var setCustomUrlColumnDef = function (_columnName) {
    var internalName = grabAnalysisInternalName(assayAttributes);
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

  // populates the ui-grid columns variable
  var createColumnDefs = function () {
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
      if (columnName === 'Url') {
        // Url requires a custom template for downloading links
        tempCustomColumnNames.push(setCustomUrlColumnDef(columnName));
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
  };

  // helper method to trim assayFiles data for caching purposes
  var trimAssayFiles = function (sliceCount, startInd) {
    if (startInd === undefined) {
      angular.copy(assayFiles.slice(sliceCount), assayFiles);
    } else {
      angular.copy(assayFiles.slice(startInd, sliceCount), assayFiles);
    }
  };

  return {
    analysisFilter: analysisFilter,
    assayAttributes: assayAttributes,
    assayAttributeOrder: assayAttributeOrder,
    assayFiles: assayFiles,
    assayFilesTotalItems: assayFilesTotalItems,
    attributeFilter: attributeFilter,
    customColumnNames: customColumnNames,
    nodeGroupList: nodeGroupList,
    createColumnDefs: createColumnDefs,
    createNodeGroup: createNodeGroup,
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    getNodeGroupList: getNodeGroupList,
    postAssayAttributeOrder: postAssayAttributeOrder,
    resetAssayFiles: resetAssayFiles,
    trimAssayFiles: trimAssayFiles
  };
}

angular
  .module('refineryFileBrowser')
  .factory('fileBrowserFactory', [
    '$log',
    '_',
    '$window',
    'assayAttributeService',
    'assayFileService',
    'fileBrowserSettings',
    'nodeGroupService',
    'nodeService',
    'selectedFilterService',
    fileBrowserFactory
  ]
);
