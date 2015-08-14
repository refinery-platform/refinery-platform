angular.module('refineryAnalyses').filter('analysesHumanizeTime',analysesHumanizeTime);

function analysesHumanizeTime(){
  return function(param){
    if(typeof param !== "undefined" && param !== null) {
      var unixtime = Date.parse(param) / 1000;
      return (
        humanize.relativeTime(unixtime)
      );
    }
  };
}
