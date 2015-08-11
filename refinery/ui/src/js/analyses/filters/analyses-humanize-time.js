angular.module('refineryAnalyses').filter('analysesHumanizeTime',analysesHumanizeTime);

function analysesHumanizeTime(){
  return function(param){
    //Analyses API returns time with T in between date/time.
    var sliceIndex = param.indexOf("T");
    if(typeof sliceIndex !== undefined) {
      var paramDate = param.replace(/T/i, " ");
      var unixtime = Date.parse(paramDate)/1000;
      return (
        humanize.relativeTime(unixtime)
      );
    }
  };
}
