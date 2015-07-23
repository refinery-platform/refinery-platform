angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', analysesFactory]);

function analysesFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/analysis";
  var analysesList = [];
  var analysesGlobalList = [];
  var analysesDetail = {};
  var analysesGlobalDetail = {};
  var analysesRunningGlobalList = [];
  var analysesRunningList = [];
  var analysesOne = [];

  var initializeAnalysesDetail = function(uuid, analysesObj){
    analysesObj[uuid]={
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

  var getAnalysesOne = function(uuid) {
    return $http.get(serverUrl + '/?format=json&limit=1&uuid='+ uuid)
      .then(function (response) {
      angular.copy(response.data.objects,analysesOne);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };


  //http.post header needed to be adjusted because django was not recognizing it
  // as an ajax call.
  var getAnalysesDetail = function(uuid, analysesType) {
    analysesType = analysesType || "";
    
    return $http({
      method: 'POST',
      url: '/analysis_manager/' + uuid + "/?format=json",
      headers: { "X-Requested-With" : 'XMLHttpRequest'}
    }).then(function(response){
      //console.log(response);
        if(analysesType === "global") {
          processAnalysesGlobalDetail(response.data, uuid, analysesGlobalDetail);
        }else{
          processAnalysesGlobalDetail(response.data, uuid, analysesDetail);
        }
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
  var processAnalysesGlobalDetail = function(data, uuid, analysesObj){
    if(!(analysesObj.hasOwnProperty(uuid))){
      initializeAnalysesDetail(uuid, analysesObj);
    }
    setPreprocessingStatus(data, uuid, analysesObj);
    setPostprocessingStatus(data, uuid, analysesObj);
    if(data.execution != null){
      setExecutionStatus(data, uuid, analysesObj);
    }
  };

  var isNotPending = function(state){
    if(state === 'PENDING'){
      return false;
    }else{
      return true;
    }
  };

  var setPreprocessingStatus = function(data, uuid, analysesObj){
     if( isNotPending(data.preprocessing[0].state)) {
       analysesObj[uuid].preprocessing = data.preprocessing[0].state;
       if( data.preprocessing[0].percent_done > analysesObj[uuid].preprocessingPercentDone) {
        analysesObj[uuid].preprocessingPercentDone = data.preprocessing[0].percent_done;
       }
    }
  };

  var setPostprocessingStatus = function(data, uuid, analysesObj){
     if( isNotPending(data.postprocessing[0].state)) {
       analysesObj[uuid].postprocessing = data.postprocessing[0].state;
       if(data.postprocessing[0].percent_done > analysesObj[uuid].postprocessingPercentDone) {
        analysesObj[uuid].postprocessingPercentDone = data.postprocessing[0].percent_done;
       }
    }
  };

  var setExecutionStatus = function(data, uuid, analysesObj){
     if(isNotPending(data.execution[0].state)) {
       analysesObj[uuid].execution = data.execution[0].state;
       if( data.execution[0].percent_done > analysesObj[uuid].executionPercentDone) {
        analysesObj[uuid].executionPercentDone = data.execution[0].percent_done;
       }
     }
  };

 return{
   getAnalysesList: getAnalysesList,
   getAnalysesGlobalList: getAnalysesGlobalList,
   getAnalysesDetail: getAnalysesDetail,
   postCancelAnalysis: postCancelAnalysis,
   getAnalysesRunningGlobalList:getAnalysesRunningGlobalList,
   getAnalysesRunningList:getAnalysesRunningList,
   getAnalysesOne: getAnalysesOne,
   analysesList: analysesList,
   analysesGlobalList: analysesGlobalList,
   analysesDetail: analysesDetail,
   analysesGlobalDetail: analysesGlobalDetail,
   analysesRunningList:analysesRunningList,
   analysesRunningGlobalList:analysesRunningGlobalList,
   analysesOne:analysesOne,
 };
}
