'use strict';

function analysisMonitorOffset () {
  return function (input, _start_) {
    var start = parseInt(_start_, 10);
    if (start) {
      return input.slice(start);
    }
    return input;
  };
}

angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorOffset', [analysisMonitorOffset]);
