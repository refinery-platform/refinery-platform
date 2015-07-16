angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http', analysesFactory]);

function analysesFactory($http) {
  "use strict";
  var serverUrl = "/api/v1/analysis";
  var analysesList = [];
  var analysesDetail = {};

  //http.post header needed to be adjusted because django was not recognizing it
  // as an ajax call.
  var getAnalysesDetail = function(uuid) {
    return $http({
      method: 'POST',
      url: '/analysis_manager/' + uuid + "/?format=json",
      data: {'csrfmiddlewaretoken': csrf_token},
      headers: { "X-Requested-With" : 'XMLHttpRequest'}
    }).then(function(response){
      processAnalysesDetail(response.data);
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
    }, function(jqXHR){
      console.error("Error accessing postCancelAnalysis");
      console.log(jqXHR);
    });
  };

  var processAnalysesDetail = function(data){
    setPreprocessingStatus(data);
    setPostprocessingStatus(data);
    if(data.execution != null){
      setExecutionStatus(data);
    }
  };

  var isNotPending = function(state){
    if(state === 'PENDING'){
      return false;
    }else{
      return true;
    }
  };

  var setPreprocessingStatus = function(data){
     if(!(analysesDetail.hasOwnProperty('preprocessing')) || isNotPending(data.preprocessing[0].state)) {
      analysesDetail.preprocessing = data.preprocessing[0].state;
       if(!(analysesDetail.hasOwnProperty('preprocessingPrecentDone')) || data.preprocessing[0].percent_done > analysesDetail.preprocessingPercentDone) {
        analysesDetail.preprocessingPercentDone = data.preprocessing[0].percent_done;
       }
    }
  };

  var setPostprocessingStatus = function(data){
     if(!(analysesDetail.hasOwnProperty('postprocessing')) || isNotPending(data.postprocessing[0].state)) {
      analysesDetail.postprocessing = data.postprocessing[0].state;
       if(!(analysesDetail.hasOwnProperty('postprocessingPrecentDone')) || data.postprocessing[0].percent_done > analysesDetail.postprocessingPercentDone) {
        analysesDetail.postprocessingPercentDone = data.postprocessing[0].percent_done;
       }
    }
  };

  var setExecutionStatus = function(data){
     if(!(analysesDetail.hasOwnProperty('execution')) || isNotPending(data.execution[0].state)) {
      analysesDetail.execution = data.execution[0].state;
       if(!(analysesDetail.hasOwnProperty('executionPrecentDone')) || data.execution[0].percent_done > analysesDetail.executionPercentDone) {
        analysesDetail.executionPercentDone = data.execution[0].percent_done;
       }
     }
  };

  var getAnalysesList = function() {
    return $http.get(serverUrl +
      '/?format=json&limit=0&order_by=creation_date&data_set__uuid='+ dataSetUuid)
      .then(function (response) {
      angular.copy(response.data.objects.reverse(),analysesList);
    }, function (response) {
      console.error("Error accessing analyses API.");
    });
  };

 return{
   getAnalysesList: getAnalysesList,
   getAnalysesDetail: getAnalysesDetail,
   postCancelAnalysis: postCancelAnalysis,
   analysesDetail: analysesDetail,
   analysesList: analysesList,
 };
}
