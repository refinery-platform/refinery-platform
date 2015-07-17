angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', analysesFactory]);

function analysesFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/analysis";
  var analysesList = [];
  var analysesDetail = {};


  var initializeAnalysesDetail = function(uuid){
    analysesDetail[uuid]={
      "preprocessing": null,
      "preprocessingPercentDone":'0%',
      "execution": null,
      "executionPercentDone":'0%',
      "postprocessing":null,
      "postprocessingPercentDone":'0%',
      "cancelingAnalyses":false,
    };
  };

  //Ajax calls
  var getAnalysesList = function() {
    return $http.get(serverUrl +
      '/?format=json&limit=0&order_by=creation_date&data_set__uuid='+ dataSetUuid)
      .then(function (response) {
      angular.copy(response.data.objects.reverse(),analysesList);
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
      processAnalysesDetail(response.data, uuid);
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
  var processAnalysesDetail = function(data, uuid){
    if(!(analysesDetail.hasOwnProperty(uuid))){
      initializeAnalysesDetail(uuid);
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
       analysesDetail[uuid].preprocessing = data.preprocessing[0].state;
       if( data.preprocessing[0].percent_done > analysesDetail[uuid].preprocessingPercentDone) {
        analysesDetail[uuid].preprocessingPercentDone = data.preprocessing[0].percent_done;
       }
    }
  };

  var setPostprocessingStatus = function(data, uuid){
     if( isNotPending(data.postprocessing[0].state)) {
       analysesDetail[uuid].postprocessing = data.postprocessing[0].state;
       if(data.postprocessing[0].percent_done > analysesDetail[uuid].postprocessingPercentDone) {
        analysesDetail[uuid].postprocessingPercentDone = data.postprocessing[0].percent_done;
       }
    }
  };

  var setExecutionStatus = function(data, uuid){
     if(isNotPending(data.execution[0].state)) {
       analysesDetail[uuid].execution = data.execution[0].state;
       if( data.execution[0].percent_done > analysesDetail[uuid].executionPercentDone) {
        analysesDetail[uuid].executionPercentDone = data.execution[0].percent_done;
       }
     }
  };

  /*Creates a list of analysis running uuids for getting analyses details*/
  var createAnalysesRunningList = function(data){
    var tempArr = [];
    for(var i = 0; i<data.length; i++){
      if(data[i].status === "RUNNING" || data[i].status === "INITIALIZED"){
        tempArr.push(data[i].uuid);
      }
    }
    return tempArr;
  };

 return{
   getAnalysesList: getAnalysesList,
   getAnalysesDetail: getAnalysesDetail,
   postCancelAnalysis: postCancelAnalysis,
   createAnalysesRunningList: createAnalysesRunningList,
   analysesDetail: analysesDetail,
   analysesList: analysesList,
 };
}
