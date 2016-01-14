angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorRunningStatusBtn',analysisMonitorRunningStatusBtn);

//stage icon for the global analysis
function analysisMonitorRunningStatusBtn(){
  return function(param){
    if (typeof param !== "undefined") {
      if (param.preprocessing !== "SUCCESS") {
        return "fa fa-arrow-circle-down";
      } else if (param.execution !== "SUCCESS") {
        return "fa fa-cog";
      } else if (param.postprocessing !== "SUCCESS") {
        return "fa fa-arrow-circle-up";
      } else {
        return "fa fa-question-circle";
      }
    }else{
      return "refinery-spinner analyses-view";
    }
  };
}
