'use strict';

angular
  .module('refineryApp')
  .filter('analysisStatusIcon', function () {
    return function (param) {
      switch (param) {
        case 'SUCCESS':
          return 'fa fa-check-circle';
        case 'FAILURE':
          return 'fa fa-exclamation-triangle';
        case 'RUNNING':
          return 'fa fa-cog';
        case 'INITIALIZED':
          return 'fa fa-cog';
        default:
          return 'fa fa-question-circle';
      }
    };
  });
