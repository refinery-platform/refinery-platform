'use strict';

function basePathFilter () {
  return function (param) {
    if (param !== undefined) {
      // split on backslash
      var urlSplitArray = param.split('/');
      // expect param, location/of/thing/fileName - pop fileName
      return urlSplitArray.pop();
    }
    return param;
  };
}

angular.module('refineryDataSetAbout')
  .filter('basePathFilter', [basePathFilter]);
