/**
 * Time Service
 * @namespace timeService
 * @desc Collection of time helper functions
 * @memberOf refineryApp
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .service('timeService', timeService);

  timeService.$inject = ['humanize'];


  function timeService (humanize) {
    var vm = this;
    vm.getTimeStamp = getTimeStamp;
    vm.humanizeTimeObj = humanizeTimeObj;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    function getTimeStamp () {
      var currentDate = new Date();
      var month = currentDate.getMonth() + 1;
      var day = currentDate.getDate();
      var year = currentDate.getFullYear();
      var hour = currentDate.getHours();
      var mins = currentDate.getMinutes();
      var sec = currentDate.getSeconds();

      if (mins < 10) {
        mins = '0' + mins;
      }

      if (sec < 10) {
        sec = '0' + sec;
      }

      var dateStr = year + '-' + month + '-' + day;
      var timeStr = '@' + hour + ':' + mins + ':' + sec;

      return (dateStr + timeStr);
    }

    function humanizeTimeObj (param) {
      var a = param.split(/[^0-9]/);
      var testDate = Date.UTC(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
      var curDate = new Date().getTimezoneOffset() * 60 * 1000;
      var offsetDate = testDate + curDate;
      var unixtime = offsetDate / 1000;
      return humanize.relativeTime(unixtime);
    }
  }
})();
