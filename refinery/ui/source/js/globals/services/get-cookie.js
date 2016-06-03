'use strict';

/**
 * Returns the value of a cookie.
 *
 * @method  getCookie
 * @author  Fritz Lekschas
 * @date    2016-05-11
 * @param   {String}  name  Name of the cookie to be read.
 * @return  {String}        Value of the cookie.
 */
function getCookie (name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      // Trim whitespace from the beginning and end of the cookie string.
      var cookie = /^\s*(\S*)\s*$/.exec(cookies[i])[1];
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(
          cookie.substring(name.length + 1)
        );
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Angular cookie service helper.
 *
 * @method  getCookieService
 * @author  Fritz Lekschas
 * @date    2016-05-11
 * @return  {Function}  The actual service function.
 */
function getCookieService () {
  return getCookie;
}

angular
  .module('getCookie', [])
  .service('getCookie', [getCookieService]);
