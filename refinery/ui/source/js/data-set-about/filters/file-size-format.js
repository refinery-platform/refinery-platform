'use strict';

function fileSizeFormat () {
  return function (param) {
    if (param !== undefined) {
      var fileStr = param;
      if (fileStr < 1024) {
        return fileStr + ' Bytes';
      }
      fileStr /= 1024;
      if (fileStr < 1024) {
        return fileStr.toFixed(1) + ' Kb';
      }
      fileStr /= 1024;
      if (fileStr < 1024) {
        return fileStr.toFixed(1) + ' Mb';
      }
      fileStr /= 1024;
      if (fileStr < 1024) {
        return fileStr.toFixed(1) + ' Gb';
      }
      fileStr /= 1024;
      return fileStr.toFixed(1) + ' Tb';
    }
    return param;
  };
}

angular.module('refineryDataSetAbout')
  .filter('fileSizeFormat', [fileSizeFormat]);
