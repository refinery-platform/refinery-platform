angular
  .module('refineryApp')
  .filter('analysisStatusTitle', function () {
    return function(param){
      switch (param) {
        case 'SUCCESS':
          return 'Analysis successful.';
        case 'FAILURE':
          return 'Analysis failed.';
        case 'RUNNING':
          return 'Analysis is running.';
        default:
          return 'Analysis status unknown.';
      }
    };
  });

