angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorRunningStatusBtn',analysisMonitorRunningStatusBtn);

//stage icon for the global analysis
function analysisMonitorRunningStatusBtn(){
  return function(param){
    if (typeof param !== "undefined") {
      if (param.preprocessing !== "SUCCESS") {
        return "icon-circle-arrow-down";
      } else if (param.execution !== "SUCCESS") {
        return "icon-cog";
      } else if (param.postprocessing !== "SUCCESS") {
        return "icon-circle-arrow-up";
      } else {
        return "icon-question-sign";
      }
    }else{
      return "refinery-spinner analyses-view";
    }
  };
}
