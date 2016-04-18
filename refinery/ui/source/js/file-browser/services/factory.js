angular
  .module('refineryFileBrowser')
  .factory("fileBrowserFactory",
    [
      '$http',
      'assayFileService',
      'dataSetService',
      'settings',
      '$window',
      fileBrowserFactory
    ]
  );

function fileBrowserFactory(
  $http,
  assayFileService,
  dataSetService,
  settings,
  $window) {

  "use strict";
  var assayFiles = [];
  var assayAttributes = [];
  var assayAttributeOrder = [];
  var attributeFilter = {};
  var analysisFilter = {};
  var assayFilesTotalItems = {};
  var is_owner = false;

  var getDataSet = function (){
   // console.log('in get data set');
    var params = {uuid: $window.dataSetUuid};
    var dataSet = dataSetService.query(params);
    dataSet.$promise.then(function(response){
    //  console.log(response.objects[0].is_owner);
      is_owner = response.objects[0].is_owner;
    });
    return dataSet.$promise;
  };

  var getAssayFiles = function (params) {
    params = params || {};

    //encodes all field names to avoid issues with escape characters.
    if(typeof params.filter_attribute !== 'undefined'){
      params.filter_attribute = encodeAttributeFields(params.filter_attribute);
    }

    var assayFile = assayFileService.query(params);
    assayFile.$promise.then(function (response) {
      angular.copy(response.attributes, assayAttributes);
      angular.copy(response.nodes, assayFiles);
      assayFilesTotalItems.count = response.nodes_count;
      var filterObj = generateFilters(response.attributes, response.facet_field_counts);
      angular.copy(filterObj.attributeFilter, attributeFilter);
      angular.copy(filterObj.analysisFilter, analysisFilter);
    }, function (error) {
      console.log(error);
    });
    return assayFile.$promise;
  };

  var generateFilters = function(attributes, facet_counts){
    //resets the attribute filters, which can be changed by owners
    var outAttributeFilter = {};
    var outAnalysisFilter = {};

    attributes.forEach(function(facetObj){
      var facetObjCount =  facet_counts[facetObj.internal_name];
       //for filtering out (only)attributes with only 1 field
      var facetObjCountMinLen = Object.keys(facetObjCount).length > 1;

      if(facetObjCountMinLen && facetObj.display_name !== 'Analysis'){
        outAttributeFilter[facetObj.display_name] = {
          'facetObj': facetObjCount,
          'internal_name': facetObj.internal_name
        };
      }else if(facetObjCount && facetObj.display_name === 'Analysis'){
        outAnalysisFilter[facetObj.display_name]= {
          'facetObj': facetObjCount,
          'internal_name': facetObj.internal_name
        };
      }
    });
    return {
      'attributeFilter': outAttributeFilter,
      'analysisFilter': outAnalysisFilter
    };
  };

  var getAssayAttributeOrder = function (uuid) {
    var apiUrl = settings.appRoot + settings.refineryApiV2 +
      '/assays/' + uuid + '/attributes/';

    return $http({
      method: 'GET',
      url: apiUrl,
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid}
    }).then(function (response) {
      var sortedResponse = sortArrayOfObj(response.data);
      angular.copy(sortedResponse, assayAttributeOrder);
    }, function (error) {
      console.log(error);
    });
  };

  var postAssayAttributeOrder = function (attributeParam) {
    var assayUuid = $window.externalAssayUuid;
    var dataObj = {
      'csrfmiddlewaretoken': csrf_token,
      'uuid': assayUuid,
      'solr_field':attributeParam.solr_field,
      'is_exposed': attributeParam.is_exposed,
      'is_active': attributeParam.is_active,
      'is_facet': attributeParam.is_facet,
      'rank': attributeParam.rank
    };
    return $http({
      method: 'PUT',
      url: settings.appRoot + settings.refineryApiV2 +
          '/assays/' + assayUuid + '/attributes/',
      data: dataObj
    }).then(function (response) {
      for (var ind = 0; ind < assayAttributeOrder.length; ind++){
        if(assayAttributeOrder[ind].solr_field === response.data.solr_field){
          angular.copy(response.data, assayAttributeOrder[ind]);
          break;
        }
      }
    }, function (error) {
      console.log(error);
    });
  };

  //Helper function encodes field array in an obj
  var encodeAttributeFields = function(attributeObj) {
    angular.forEach(attributeObj, function(fieldArray){
       for(var ind=0; ind < fieldArray.length; ind++){
        fieldArray[ind] = $window.encodeURIComponent(fieldArray[ind]);
       }
    });
    return(attributeObj);
  };

  var sortArrayOfObj = function(arrayOfObjs) {
    arrayOfObjs.sort(function (a, b) {
      if (a.rank > b.rank) {
        return 1;
      }
      if (a.rank < b.rank) {
        return -1;
      }
      return 0;
    });
    return arrayOfObjs;
  };

  return{
    is_owner: is_owner,
    assayFiles: assayFiles,
    assayAttributes: assayAttributes,
    assayAttributeOrder: assayAttributeOrder,
    attributeFilter: attributeFilter,
    analysisFilter: analysisFilter,
    assayFilesTotalItems: assayFilesTotalItems,
    getDataSet: getDataSet,
    getAssayFiles: getAssayFiles,
    getAssayAttributeOrder: getAssayAttributeOrder,
    postAssayAttributeOrder: postAssayAttributeOrder
  };

}
