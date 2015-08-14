angular.module('refineryAnalyses')
    .factory("analysesFactory", ['$http','analysisService', analysesFactory]);

function analysesFactory($http, analysisService) {
  "use strict";
  var analysesList = [];
  var analysesGlobalList = [];
  var analysesDetail = {};
  var analysesRunningGlobalList = [];
  var analysesRunningList = [];
  var analysesOne = [];

  var initializeAnalysesDetail = function (uuid) {
    analysesDetail[uuid] = {
      "preprocessing": '',
      "preprocessingPercentDone": '0%',
      "execution": '',
      "executionPercentDone": '0%',
      "postprocessing": '',
      "postprocessingPercentDone": '0%',
      "cancelingAnalyses": false,
    };
  };

  //Ajax calls

  var getAnalysesList = function (params) {
    params = params || {};

    var analysis = analysisService.query(params);
    analysis.$promise.then(function (response) {
      processAnalysesList(response.objects, params);
    }, function (error) {
      console.log(error);
    });

    return analysis.$promise;
  };

  var processAnalysesList = function (data, params) {
    if ('status' in params && 'data_set__uuid' in params) {
      angular.copy(data, analysesRunningList);
    } else if ('status' in params) {
      angular.copy(data, analysesRunningGlobalList);
    } else if ('limit' in params && 'data_set__uuid' in params) {
      addElapseAndHumanTime(data);
    } else {
      angular.copy(data, analysesGlobalList);
    }
  };

  //http.post header needed to be adjusted because django was not recognizing it
  // as an ajax call.
  var getAnalysesDetail = function (uuid) {

    return $http({
      method: 'POST',
      url: '/analysis_manager/' + uuid + "/?format=json",
      headers: {"X-Requested-With": 'XMLHttpRequest'}
    }).then(function (response) {
      processAnalysesGlobalDetail(response.data, uuid);
    }, function (error) {
      console.error("Error accessing analysis monitoring API");
    });
  };

  var postCancelAnalysis = function (uuid) {
    return $http({
      method: 'POST',
      url: '/analysis_manager/analysis_cancel/',
      data: {'csrfmiddlewaretoken': csrf_token, 'uuid': uuid},
      headers: {"X-Requested-With": 'XMLHttpRequest'}
    }).then(function (response) {
      console.log(response);
    }, function (error) {
      console.error("Error accessing analysis_cancel API");
    });
  };

  /*process responses from api*/
  var addElapseAndHumanTime = function (data) {
    angular.copy(data, analysesList);
    for (var j = 0; j < analysesList.length; j++) {
      analysesList[j].elapseTime = createElapseTime(analysesList[j]);
      if (isObjExist(analysesList[j].time_start) && isObjExist(analysesList[j].time_end)){
        analysesList[j].humanizeStartTime = humanizeTimeObj(analysesList[j].time_start);
        analysesList[j].humanizeEndTime = humanizeTimeObj(analysesList[j].time_end);
      }
    }
  };

  var humanizeTimeObj = function(param){
    var a = param.split(/[^0-9]/);
        var testDate = Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
        var curDate = new Date().getTimezoneOffset() * 60 * 1000;
        var offsetDate = testDate + curDate;
        var unixtime = offsetDate / 1000;

        return (
          humanize.relativeTime(unixtime)
        );
  };

  var isObjExist = function (data) {
    if (typeof data !== "undefined" && data !== null){
      return true;
      }else{
      return false;
    }
  };

  var createElapseTime = function(timeObj){
    if(isParamValid(timeObj)) {
      var startTime = formatMilliTime(timeObj.time_start);
      var endTime = formatMilliTime(timeObj.time_end);
      var elapseMilliTime = endTime - startTime;
      return elapseMilliTime;
    }else{
      return null;
    }
  };

  var formatMilliTime = function(timeStr){
    var milliTime = Date.parse(timeStr);
    return milliTime;
  };

  var isParamValid = function(data){
     if(typeof data !== 'undefined' && typeof data.time_start !== 'undefined' &&
       typeof data.time_end !== 'undefined' && data.time_start !== null &&
       data.time_end !== null){
        return true;
     }else{
       return false;
     }
  };

  var processAnalysesGlobalDetail = function(data, uuid){
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
        analysesDetail[uuid].preprocessingPercentDone = Math.floor(data.preprocessing[0].percent_done.replace("%","")) + "%";
       }
    }
  };

  var setPostprocessingStatus = function(data, uuid){
     if( isNotPending(data.postprocessing[0].state)) {
       analysesDetail[uuid].postprocessing = data.postprocessing[0].state;
       if(data.postprocessing[0].percent_done > analysesDetail[uuid].postprocessingPercentDone) {
        analysesDetail[uuid].postprocessingPercentDone = Math.floor(data.postprocessing[0].percent_done.replace("%","")) + "%";
       }
    }
  };

  var setExecutionStatus = function(data, uuid){
     if(isNotPending(data.execution[0].state)) {
       analysesDetail[uuid].execution = data.execution[0].state;
       if( data.execution[0].percent_done > analysesDetail[uuid].executionPercentDone) {
        analysesDetail[uuid].executionPercentDone = Math.floor(data.execution[0].percent_done.replace("%","")) + "%";
       }
     }
  };

 return{
   getAnalysesList: getAnalysesList,
   getAnalysesDetail: getAnalysesDetail,
   postCancelAnalysis: postCancelAnalysis,
   analysesList: analysesList,
   analysesGlobalList: analysesGlobalList,
   analysesDetail: analysesDetail,
   analysesRunningList:analysesRunningList,
   analysesRunningGlobalList:analysesRunningGlobalList,
 };
}

