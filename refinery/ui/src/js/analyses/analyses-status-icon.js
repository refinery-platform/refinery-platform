angular.module('refineryAnalyses').filter('analysesStatusIcon',analysesStatusIcon);

function analysesStatusIcon(){
  return function(param){
    switch (param) {
      case "SUCCESS":
        return "icon-ok-sign";
      case "FAILURE":
        return "icon-warning-sign";
      case "RUNNING":
        return "icon-cog icon-spin icon-large";
      default:
        return "icon-question-sign";
    }
  };
}

