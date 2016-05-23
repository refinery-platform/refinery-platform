'use strict';

// stage percent for the global analysis
function analysisMonitorRunningStatusPercent () {
  return function (param) {
    if (typeof param !== 'undefined' && Object.keys(param).length > 0) {
      if (param.refineryImport.state !== 'SUCCESS') {
        return param.refineryImport.percent_done;
      } else if (param.galaxyImport.state !== 'SUCCESS') {
        return param.galaxyImport.percent_done;
      } else if (param.galaxyAnalysis.state !== 'SUCCESS') {
        return param.galaxyAnalysis.percent_done;
      } else if (param.galaxyExport.state !== 'SUCCESS') {
        return param.galaxyExport.percent_done;
      }
      return 0;
    }
    return '...';
  };
}

angular
  .module('refineryAnalysisMonitor')
  .filter('analysisMonitorRunningStatusPercent', [
    analysisMonitorRunningStatusPercent
  ]);
