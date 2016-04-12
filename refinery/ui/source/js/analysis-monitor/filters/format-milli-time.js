'use strict';

function analysisMonitorFormatMilliTime () {
  var milliToReadStr = function (milliSec) {
    var days = Math.floor(milliSec / 86400000);
    var hours = Math.floor((milliSec % 86400000) / 3600000);
    var mins = Math.floor(((milliSec % 86400000) % 3600000) / 60000);
    var secs = Math.floor((((milliSec % 86400000) % 3600000) % 60000) / 1000);

    var timeStr = '';

    if (days > 0) {
      if (days === 1) {
        timeStr = timeStr.concat(days + ' day ');
      } else {
        timeStr = timeStr.concat(days + ' days ');
      }
    }
    if (hours > 0) {
      if (hours === 1) {
        timeStr = timeStr.concat(hours + ' hour ');
      } else {
        timeStr = timeStr.concat(hours + ' hours ');
      }
    }
    if (mins > 0) {
      if (mins === 1) {
        timeStr = timeStr.concat(mins + ' min ');
      } else {
        timeStr = timeStr.concat(mins + ' mins ');
      }
    }
    if (secs > 0) {
      if (secs === 1) {
        timeStr = timeStr.concat(secs + ' sec ');
      } else {
        timeStr = timeStr.concat(secs + ' secs ');
      }
    }
    return timeStr;
  };

  return function (param) {
    if (typeof param !== 'undefined' && param !== null) {
      return milliToReadStr(param);
    }
    return undefined;
  };
}

angular
  .module('refineryAnalysisMonitor')
  .filter('analysisMonitorFormatMilliTime', [analysisMonitorFormatMilliTime]);
