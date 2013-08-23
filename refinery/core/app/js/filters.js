'use strict';

/* Filters */

angular.module('core.filters', []).
  filter('interpolate', ['version', function(version) {
    return function(text) {
      return String(text).replace(/\%VERSION\%/mg, version);
    }
  }]).
  filter('affiliate', ['author', function(author) {
    return function(text) {
      return String(text).replace(/\%AUTHOR\%/mg, author);
    }
  }]);
