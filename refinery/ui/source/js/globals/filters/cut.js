'use strict';

angular
  .module('cut', [])
  .filter('cut', function () {
    return function (value, wordwise, max, tail) {
      if (!value) {
        return '';
      }

      var maxInt = parseInt(max, 10);

      if (!maxInt) {
        return value;
      }

      // Check if value is a string
      // From: http://stackoverflow.com/a/9436948/981933
      if (!(typeof (value) === 'string' || value instanceof String)) {
        return '';
      }

      if (value.length <= maxInt) {
        return value;
      }

      var trimmedValue = value.substr(0, maxInt);
      if (wordwise) {
        var lastspace = trimmedValue.lastIndexOf(' ');
        if (lastspace !== -1) {
          trimmedValue = trimmedValue.substr(0, lastspace);
        }
      }

      return trimmedValue + (tail || '…');
    };
  });
