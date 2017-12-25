'use strict';

function analysisMonitorFactory (
  $http,
  $log,
  $window,
  analysisService,
  analysisDetailService,
  timeService
) {
  var analysesList = [];
  var analysesRunningList = [];
  var analysesGlobalList = [];
  var analysesRunningGlobalList = [];
  var analysesDetail = {};
  var docCount = {}; // meta data for document count

  var initializeAnalysesDetail = function (uuid) {
    analysesDetail[uuid] = {
      refineryImport: {
        status: '',
        percent_done: 0
      },
      galaxyImport: {
        status: '',
        percent_done: 0
      },
      galaxyAnalysis: {
        status: '',
        percent_done: 0
      },
      galaxyExport: {
        status: '',
        percent_done: 0
      },
      cancelingAnalyses: false
    };
  };

  // Helper method checking if object is defined
  var isObjDefined = function (data) {
    if (data !== undefined && data !== null) {
      return true;
    }
    return false;
  };

  var formatMilliTime = function (timeStr) {
    var milliTime = Date.parse(timeStr);
    return milliTime;
  };

  var isParamValid = function (data) {
    if (data !== undefined && isObjDefined(data.time_start) &&
       isObjDefined(data.time_end)
    ) {
      return 'complete';
    } else if (data !== undefined && isObjDefined(data.time_start)) {
      return 'running';
    }
    return 'false';
  };

  var averagePercentDone = function (numArr) {
    var totalSum = 0;
    for (var i = 0; i < numArr.length; i++) {
      totalSum = totalSum + numArr[i];
    }
    if (totalSum > 0) {
      return totalSum / numArr.length;
    }
    return totalSum;
  };

  var createElapseTime = function (timeObj) {
    var startTime;
    var endTime;
    var elapseMilliTime;

    if (isParamValid(timeObj) === 'complete') {
      startTime = formatMilliTime(timeObj.time_start);
      endTime = formatMilliTime(timeObj.time_end);
      elapseMilliTime = endTime - startTime;
      return elapseMilliTime;
    } else if (isParamValid(timeObj) === 'running') {
      var curTime = new Date() - new Date().getTimezoneOffset() * 60 * 1000;
      startTime = formatMilliTime(timeObj.time_start);
      elapseMilliTime = curTime - startTime;
      return elapseMilliTime;
    }
    return null;
  };

  // process responses from api
  var addElapseAndHumanTime = function (data) {
    angular.copy(data, analysesList);
    for (var j = 0; j < analysesList.length; j++) {
      analysesList[j].elapseTime = createElapseTime(analysesList[j]);
      if (isObjDefined(analysesList[j].time_start)) {
        analysesList[j].humanizeStartTime = timeService.humanizeTimeObj(
          analysesList[j].time_start
        );
      }
      if (isObjDefined(analysesList[j].time_end)) {
        analysesList[j].humanizeEndTime = timeService.humanizeTimeObj(
          analysesList[j].time_end
        );
      }
    }
  };

  // Copies and sorts analyses list
  var processAnalysesList = function (data, params) {
    if ('status__in' in params && 'data_set__uuid' in params) {
      angular.copy(data, analysesRunningList);
    } else if ('status__in' in params) {
      angular.copy(data, analysesRunningGlobalList);
    } else if ('limit' in params && 'data_set__uuid' in params) {
      addElapseAndHumanTime(data);
    } else {
      angular.copy(data, analysesGlobalList);
    }
  };

  // Ajax calls, grabs the entire analysis list for a particular data set
  var getAnalysesList = function (_params_) {
    var params = _params_ || {};

    var analysis = analysisService.query(params);
    analysis.$promise.then(function (response) {
      if ('meta_only' in params) {
        docCount[params.status__in] = response.meta.total_count;
      } else {
        processAnalysesList(response.objects, params);
      }
    });

    return analysis.$promise;
  };

  var postCancelAnalysis = function (uuid) {
    return $http({
      method: 'POST',
      url: '/analysis_manager/analysis_cancel/',
      data: {
        csrfmiddlewaretoken: $window.csrf_token,
        uuid: uuid
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  };

  var setAnalysesStatus = function (data, uuid) {
    angular.forEach(data, function (dataArr, stage) {
      var tempArr = [];
      var failureFlag = false;
      if (stage !== undefined && dataArr.length > 1) {
        for (var i = 0; i < dataArr.length; i++) {
          tempArr.push(dataArr[i].percent_done);
          if (dataArr[i].state === 'FAILURE') {
            failureFlag = true;
          }
        }
        var avgPercentDone = averagePercentDone(tempArr);
        if (failureFlag) {
          analysesDetail[uuid][stage] = {
            state: 'FAILURE',
            percent_done: null
          };
        } else if (avgPercentDone === 100) {
          analysesDetail[uuid][stage] = {
            state: 'SUCCESS',
            percent_done: avgPercentDone
          };
        } else {
          analysesDetail[uuid][stage] = {
            state: 'PROGRESS',
            percent_done: avgPercentDone
          };
        }
      } else if (dataArr.length === 1) {
        analysesDetail[uuid][stage] = dataArr[0];
      }
    });
  };

  var processAnalysesGlobalDetail = function (data, uuid) {
    if (!(analysesDetail.hasOwnProperty(uuid))) {
      initializeAnalysesDetail(uuid);
    }
    setAnalysesStatus(data, uuid);
  };

  var getAnalysesDetail = function (uuid) {
    var _analysesDetail = analysisDetailService.query({
      uuid: uuid
    });

    _analysesDetail.$promise.then(function (response) {
      processAnalysesGlobalDetail(response, uuid);
    }, function () {
      $log.error('Error accessing analysis monitoring API');
    });

    return _analysesDetail.$promise;
  };

  return {
    getAnalysesList: getAnalysesList,
    getAnalysesDetail: getAnalysesDetail,
    postCancelAnalysis: postCancelAnalysis,
    analysesList: analysesList,
    analysesGlobalList: analysesGlobalList,
    analysesDetail: analysesDetail,
    analysesRunningList: analysesRunningList,
    analysesRunningGlobalList: analysesRunningGlobalList,
    docCount: docCount
  };
}

angular
  .module('refineryAnalysisMonitor')
  .factory('analysisMonitorFactory', [
    '$http',
    '$log',
    '$window',
    'analysisService',
    'analysisDetailService',
    'timeService',
    analysisMonitorFactory
  ]);
