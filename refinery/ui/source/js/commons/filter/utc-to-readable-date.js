/**
 * utcToReadableDate
 * @namespace refineryApp
 * @desc Filter which takes UTC and return a readable date
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
  .module('refineryApp')
  .filter('utcToReadableDate', function () {
    return function (utcDate) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'];
      var readableDate = '';
      if (utcDate) {
        var dateParts = utcDate.toString().split(/[^0-9]/);
        var dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        readableDate = months[dateObj.getMonth()] + ' ' +
          dateObj.getDate() + ', ' + dateObj.getFullYear();
      }
      return readableDate;
    };
  });
})();
