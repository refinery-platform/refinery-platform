'use strict';

function analysisMonitorOffset () {
  return function (input, _start_) {
    var start = parseInt(_start_, 10);
    return input.slice(start);
  };
}

angular.module('refineryAnalysisMonitor')
  .filter('analysisMonitorOffset', [analysisMonitorOffset]);
