'use strict';

function timeStamp () {
  var vm = this;

  vm.getTimeStamp = function () {
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
  };
}

angular
  .module('refineryApp')
  .service('timeStamp', [timeStamp]);
