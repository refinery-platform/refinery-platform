'use strict';

angular
  .module('refineryApp')
  .filter('analysisGroupNegativeOneWithNA', function () {
    return function (param, attributeName) {
      if (attributeName === 'Analysis Group' && param === -1 | param === '-1') {
        return 'N/A';
      }
      return param;
    };
  });

