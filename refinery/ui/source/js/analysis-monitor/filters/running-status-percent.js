angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorRunningStatusPercent',analysisMonitorRunningStatusPercent);

//stage percent for the global analysis
function analysisMonitorRunningStatusPercent(){
  return function(param) {
    if (typeof param !== "undefined" && Object.keys(param).length > 0) {
      if (param.refineryImport.state !== "SUCCESS") {
        return param.refineryImport.percentDone;
      } else if (param.galaxyImport.state !== "SUCCESS") {
        return param.galaxyImport.percentDone;
      } else if (param.galaxyAnalysis.state !== "SUCCESS") {
        return param.galaxyAnalysis.percentDone;
      } else if (param.galaxyExport.state !== "SUCCESS") {
        return param.galaxyExport.percentDone;
      } else {
        return 0;
      }
    } else {
      return "...";
    }
  };
}
