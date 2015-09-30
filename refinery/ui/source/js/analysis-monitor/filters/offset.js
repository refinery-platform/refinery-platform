angular.module('refineryAnalysisMonitor').filter('analysisMonitorOffset',analysisMonitorOffset);

function analysisMonitorOffset(){
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}
