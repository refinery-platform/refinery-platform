'use strict';

function fileBrowserFactory (
  assayFileService,
  nodeService,
  assayAttributeService,
  $window,
  $log) {
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  var attributeFilter = {};
  var analysisFilter = {};
  var assayFilesTotalItems = {};
  var nodeCount = { value: 0 };
  var nodeUrl = {};
  var csrfToken = $window.csrf_token;
  // Helper function encodes field array in an obj
  var encodeAttributeFields = function (attributeObj) {
    angular.forEach(attributeObj, function (fieldArray) {
      for (var ind = 0; ind < fieldArray.length; ind++) {
        fieldArray[ind] = $window.encodeURIComponent(fieldArray[ind]);
      }
    });
    return (attributeObj);
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

  var getAssayFiles = function (unencodeParams) {
    var params = {};
    angular.copy(unencodeParams, params);

    // encodes all field names to avoid issues with escape characters.
    if (typeof params.filter_attribute !== 'undefined') {
      params.filter_attribute = encodeAttributeFields(params.filter_attribute);
    }

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      /** Api returns uuid field, which is needed to retrieve the
       *  download file_url for nodeset api. It should be hidden in the data
       *  table first **/
      nodeCount.value = response.nodes_count;
      var culledAttributes = hideUuidAttribute(response.attributes);
      angular.copy(culledAttributes, assayAttributes);
      // Add file_download column first
      assayAttributes.unshift({ display_name: 'Url', internal_name: 'Url' });
      angular.copy(response.nodes, assayFiles);
      addNodeDetailtoAssayFiles();
      assayFilesTotalItems.count = response.nodes_count;
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

  return {
    assayFiles: assayFiles,
    assayAttributes: assayAttributes,
    assayAttributeOrder: assayAttributeOrder,
    attributeFilter: attributeFilter,
    analysisFilter: analysisFilter,
    assayFilesTotalItems: assayFilesTotalItems,
    nodeCount: nodeCount,
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    postAssayAttributeOrder: postAssayAttributeOrder
  };
}

angular
  .module('refineryFileBrowser')
  .factory('fileBrowserFactory', [
    'assayFileService',
    'nodeService',
    'assayAttributeService',
    '$window',
    '$log',
    fileBrowserFactory
  ]
);
