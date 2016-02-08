angular.module('refineryAnalysisMonitor')
    .factory("analysisMonitorFactory", ['$http','analysisService', analysisMonitorFactory]);

function analysisMonitorFactory($http, analysisService) {
  "use strict";
  var analysesList = [];
  var analysesGlobalList = [];
  var analysesDetail = {};
  var analysesRunningGlobalList = [];
  var analysesRunningList = [];


  var initializeAnalysesDetail = function(uuid){
  analysesDetail[uuid] = {
    "refineryImport": [],
    "galaxyImport": {},
    "galaxyAnalysis": {},
    "galaxyExport": [],
    "cancelingAnalyses": false
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
      processAnalysesGlobalDetail2(response.data, uuid);
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
      if (isObjExist(analysesList[j].time_start)){
        analysesList[j].humanizeStartTime = humanizeTimeObj(analysesList[j].time_start);
      }
      if (isObjExist(analysesList[j].time_end)) {
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
    var startTime;
    var endTime;
    var elapseMilliTime;

    if(isParamValid(timeObj) === 'complete') {
      startTime = formatMilliTime(timeObj.time_start);
      endTime = formatMilliTime(timeObj.time_end);
      elapseMilliTime = endTime - startTime;
      return elapseMilliTime;
    }else if (isParamValid(timeObj) === 'running'){
      var curTime = new Date() - new Date().getTimezoneOffset() * 60 * 1000;
      startTime = formatMilliTime(timeObj.time_start);
      elapseMilliTime =  curTime - startTime;
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
        return 'complete';
     }else if(typeof data !== 'undefined' && typeof data.time_start !== 'undefined' &&
       data.time_start !== null){
       return 'running';
     }else{
       return 'false';
     }
  };

  var processAnalysesGlobalDetail2 = function(data, uuid){
    if (!(analysesDetail.hasOwnProperty(uuid))){
      initializeAnalysesDetail(uuid);
    }
    setRefineryImportStatus(data, uuid);
    setGalaxyImportStatus(data, uuid);
    setGalaxyAnalysisStatus(data, uuid);
    setGalaxyExportStatus(data, uuid);
  };

  var setRefineryImportStatus = function(data, uuid){
    if (data.refineryImport){
      for (var i = 0; i < data.refineryImport.length; i++) {
        analysesDetail[uuid].refineryImport[i] = data.refineryImport[i];
      }
    }
  };

  var setGalaxyImportStatus = function(data, uuid){
    if (data.galaxyImport){
      analysesDetail[uuid].galaxyImport = data.galaxyImport[0];
    }
  };

  var setGalaxyAnalysisStatus = function(data, uuid){
    if (data.galaxyAnalysis){
      analysesDetail[uuid].galaxyAnalysis = data.galaxyAnalysis[0];
    }
  };

  var setGalaxyExportStatus = function(data, uuid){
    if (data.galaxyExport){
      for (var i = 0; i < data.galaxyExport.length; i++) {
        analysesDetail[uuid].galaxyExport[i] = data.galaxyExport[i];
      }
    }
  };

  var isNotPending = function(state){
    if(state === 'PENDING'){
      return false;
    }else{
      return true;
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

