angular.module('refineryAnalyses').filter('analysesHumanizeTime',analysesHumanizeTime);

function analysesHumanizeTime(){
  return function(param){
    if(typeof param !== "undefined" && param !== null) {
      var a = param.split(/[^0-9]/);
      var testDate = Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
      var curDate = new Date().getTimezoneOffset() * 60 * 1000;
      var offsetDate = testDate + curDate;
      var unixtime = offsetDate / 1000;

      return (
        humanize.relativeTime(unixtime)
      );
    }
  };
}
