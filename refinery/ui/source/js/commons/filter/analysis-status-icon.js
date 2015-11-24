angular
  .module('refineryApp')
  .filter('analysisStatusIcon', function () {
    return function(param){
      switch (param) {
        case "SUCCESS":
          return "fa fa-check-circle";
        case "FAILURE":
          return "fa fa-exclamation-triangle";
        case "RUNNING":
          return "icon-cog";
        case "INITIALIZED":
          return "icon-cog";
        default:
          return "fa fa-question-circle";
      }
    };
  });
