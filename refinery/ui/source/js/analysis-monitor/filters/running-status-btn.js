'use strict';

angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorRunningStatusBtn', analysisMonitorRunningStatusBtn);

//stage icon for the global analysis
function analysisMonitorRunningStatusBtn () {
  return function (param) {
    if (typeof param !== 'undefined' && Object.keys(param).length > 0) {
      if (param.refineryImport.state !== 'SUCCESS') {
        return 'fa fa-arrow-circle-down';
      } else if (param.galaxyImport.state !== 'SUCCESS') {
        return 'fa fa-arrow-circle-left';
      } else if (param.galaxyAnalysis.state !== 'SUCCESS') {
        return 'fa fa-cog';
      } else if (param.galaxyExport.state !== 'SUCCESS') {
        return 'fa fa-arrow-circle-right';
      } else {
        return 'fa fa-question-circle';
      }
    } else {
      return 'refinery-spinner analyses-view';
    }
  };
}

