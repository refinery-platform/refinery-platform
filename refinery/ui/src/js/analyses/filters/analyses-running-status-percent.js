angular.module('refineryAnalyses').filter('analysesRunningStatusPercent',analysesRunningStatusPercent);

//stage percent for the global analysis
function analysesRunningStatusPercent(){
  return function(param) {
    if (typeof param !== "undefined") {
      if (param.preprocessing !== "SUCCESS") {
        return param.preprocessingPercentDone;
      } else if (param.execution !== "SUCCESS") {
        return param.executionPercentDone;
      } else if (param.postprocessing !== "SUCCESS") {
        return param.postprocessingPercentDone;
      } else {
        return "0%";
      }
    } else {
      return "...";
    }
  };
}
