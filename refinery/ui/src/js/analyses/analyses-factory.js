angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', analysesFactory]);

function analysesFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/analysis";
  var analysesList = [];
  //var analysesDetail = {};
  var analysesGlobalDetail = {};
  var analysesGlobalList = [];
  var analysesRunningGlobalList = [];
  var analysesRunningList = [];

  var initializeAnalysesGlobalDetail = function(uuid){
    analysesGlobalDetail[uuid]={
      "preprocessing": 'PENDING',
      "preprocessingPercentDone":'0%',
      "execution": 'PENDING',
      "executionPercentDone":'0%',
      "postprocessing": 'PENDING',
      "postprocessingPercentDone":'0%',
      "cancelingAnalyses":false,
    };
  };

  //Ajax calls
  var getAnalysesList = function() {
    return $http.get(serverUrl +
      '/?format=json&limit=0&data_set__uuid='+ dataSetUuid)
      .then(function (response) {
      angular.copy(response.data.objects,analysesList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

  var getAnalysesRunningList = function() {
    return $http.get(serverUrl +
      '/?format=json&limit=0&data_set__uuid='+ dataSetUuid + '&status=RUNNING')
      .then(function (response) {
      angular.copy(response.data.objects,analysesRunningList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

  var getAnalysesRunningGlobalList = function() {
    return $http.get(serverUrl + '/?format=json&limit=0&status=RUNNING')
      .then(function (response) {
      angular.copy(response.data.objects,analysesRunningGlobalList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

  var getAnalysesGlobalList = function() {
    return $http.get(serverUrl + '/?format=json&limit=10')
      .then(function (response) {
      angular.copy(response.data.objects, analysesGlobalList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

  //http.post header needed to be adjusted because django was not recognizing it
  // as an ajax call.
  var getAnalysesDetail = function(uuid) {
    return $http({
      method: 'POST',
      url: '/analysis_manager/' + uuid + "/?format=json",
      data: {'csrfmiddlewaretoken': csrf_token},
      headers: { "X-Requested-With" : 'XMLHttpRequest'}
    }).then(function(response){
      //console.log(response);
      processAnalysesGlobalDetail(response.data, uuid);
      }, function(error){
        console.error("Error accessing analysis monitoring API");
      });
  };

  var postCancelAnalysis = function(uuid){
    return $http({
      method: 'POST',
      url: '/analysis_manager/analysis_cancel/',
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid},
      headers: { "X-Requested-With" : 'XMLHttpRequest'}
    }).then(function(response){
      console.log(response);
    }, function(error){
      console.error("Error accessing analysis_cancel API");
    });
  };

  /*process responses from api*/
  var processAnalysesGlobalDetail = function(data, uuid){
    if(!(analysesGlobalDetail.hasOwnProperty(uuid))){
      initializeAnalysesGlobalDetail(uuid);
    }
    setPreprocessingStatus(data, uuid);
    setPostprocessingStatus(data, uuid);
    if(data.execution != null){
      setExecutionStatus(data, uuid);
    }
  };

  var isNotPending = function(state){
    if(state === 'PENDING'){
      return false;
    }else{
      return true;
    }
  };

  var setPreprocessingStatus = function(data, uuid){
     if( isNotPending(data.preprocessing[0].state)) {
       analysesGlobalDetail[uuid].preprocessing = data.preprocessing[0].state;
       if( data.preprocessing[0].percent_done > analysesGlobalDetail[uuid].preprocessingPercentDone) {
        analysesGlobalDetail[uuid].preprocessingPercentDone = data.preprocessing[0].percent_done;
       }
    }
  };

  var setPostprocessingStatus = function(data, uuid){
     if( isNotPending(data.postprocessing[0].state)) {
       analysesGlobalDetail[uuid].postprocessing = data.postprocessing[0].state;
       if(data.postprocessing[0].percent_done > analysesGlobalDetail[uuid].postprocessingPercentDone) {
        analysesGlobalDetail[uuid].postprocessingPercentDone = data.postprocessing[0].percent_done;
       }
    }
  };

  var setExecutionStatus = function(data, uuid){
     if(isNotPending(data.execution[0].state)) {
       analysesGlobalDetail[uuid].execution = data.execution[0].state;
       if( data.execution[0].percent_done > analysesGlobalDetail[uuid].executionPercentDone) {
        analysesGlobalDetail[uuid].executionPercentDone = data.execution[0].percent_done;
       }
     }
  };

  /*Creates a list of analysis running uuids for getting analyses details*/
  //var createAnalysesRunningList = function(data){
  //  var tempArr = [];
  //  for(var i = 0; i<data.length; i++){
  //    if(data[i].status === "RUNNING" || data[i].status === "INITIALIZED"){
  //      tempArr.push(data[i].uuid);
  //    }
  //  }
  //  return tempArr;
  //};


 return{

   getAnalysesGlobalList: getAnalysesGlobalList,
   getAnalysesList: getAnalysesList,
   getAnalysesDetail: getAnalysesDetail,
   postCancelAnalysis: postCancelAnalysis,
   getAnalysesRunningGlobalList:getAnalysesRunningGlobalList,
   getAnalysesRunningList:getAnalysesRunningList,
   //createAnalysesRunningList: createAnalysesRunningList,
   analysesList: analysesList,
   analysesGlobalList: analysesGlobalList,
   analysesGlobalDetail: analysesGlobalDetail,
   analysesRunningList:analysesRunningList,
   analysesRunningGlobalList:analysesRunningGlobalList
 };
}
