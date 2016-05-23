'use strict';

function camelCaseToTitle () {
  return function (param) {
    var titledParam;
    if (param !== 'undefined') {
      // regex to split on capital letters
      titledParam = param.split(/(?=[A-Z])/);
      // capitalized first letter
      var firstLetter = titledParam[0].charAt(0).toUpperCase();
      // rejoin first letter to word
      titledParam[0] = firstLetter + titledParam[0].slice(1);

      return titledParam.join(' ');
    }
    return param;
  };
}

angular.module('refineryAnalysisMonitor')
  .filter('camelCaseToTitle', [camelCaseToTitle]);
