angular.module('refineryAnalyses').filter('analysesOffset',analysesOffset);

function analysesOffset(){
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
}
