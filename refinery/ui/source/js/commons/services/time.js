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
    vm.humanizeTimeObj = humanizeTimeObj;

    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
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
