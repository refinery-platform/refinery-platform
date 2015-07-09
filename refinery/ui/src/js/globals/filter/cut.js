angular
  .module('cut', [])
  .filter('cut', function () {
    return function (value, wordwise, max, tail) {
      'use strict';

      if (!value) {
        return '';
      }

      max = parseInt(max, 10);

      if (!max) {
        return value;
      }

      // Check if value is a string
      // From: http://stackoverflow.com/a/9436948/981933
      if (!(typeof(value) === 'string' || value instanceof String)) {
        return '';
      }

      if (value.length <= max) {
        return value;
      }

      value = value.substr(0, max);
      if (wordwise) {
        var lastspace = value.lastIndexOf(' ');
        if (lastspace != -1) {
          value = value.substr(0, lastspace);
        }
      }

      return value + (tail || '…');
    };
  });
