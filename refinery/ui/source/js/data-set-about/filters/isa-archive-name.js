'use strict';

function isaArchiveName () {
  return function (param) {
    if (param !== undefined) {
      console.log(param);
      // split on backslash
      var urlSplitArray = param.split('/');
      // expect param, location/of/thing/fileName - pop fileName
      return urlSplitArray.pop();
    }
    return param;
  };
}

angular.module('refineryDataSetAbout')
  .filter('isaArchiveName', [isaArchiveName]);
