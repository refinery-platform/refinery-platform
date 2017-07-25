'use strict';

function IntroStarter () {
  /**
   * Holding the start functions.
   *
   * @type  {Object}
   */
  var starters = {};

  /**
   * Register an intro start function
   *
   * @method  register
   * @author  Fritz Lekschas
   * @date    2016-09-16
   * @param   {String}    name     Name of the intro.
   * @param   {Function}  startFn  Intro's start function.
   */
  function register (name, startFn) {
    starters[name] = startFn;
  }

  /**
   * Start an intro
   *
   * @method  start
   * @author  Fritz Lekschas
   * @date    2016-09-16
   * @param   {String}  name  Name of the intro to start.
   */
  function start (name) {
    if (typeof starters[name] === 'function') {
      starters[name]();
    }
  }

  return {
    register: register,
    start: start
  };
}

angular
  .module('refineryDashboard')
  .factory('dashboardIntroStarter', [IntroStarter]);
