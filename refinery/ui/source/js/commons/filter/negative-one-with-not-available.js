'use strict';

angular
  .module('refineryApp')
  .filter('negativeOneWithNotAvailable', function () {
    return function (param) {
      if (param === -1) {
        return 'N/A';
      }
      return param;
    };
  });

