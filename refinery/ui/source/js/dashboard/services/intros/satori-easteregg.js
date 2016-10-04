'use strict';

function IntroSatoriEasterEgg () {
  /**
   * Holding the intro guide names
   *
   * @type  {Object}
   */
  var intro = {};

  /**
   * Holds the celebration callback.
   *
   * @type  {Function}
   */
  var celebrationCallback;

  /**
   * If `true` the user has triggered the easteregg already.
   *
   * @type  {Boolean}
   */
  var celebrated = false;

  /**
   * Helper method to check if all intros have been visited
   *
   * @method  checkIntros
   * @author  Fritz Lekschas
   * @date    2016-09-30
   * @return  {Boolean}  If `true` all intro guides have been visited.
   */
  function checkIntros () {
    var allVisited = true;
    var introNames = Object.keys(intro);
    for (var i = introNames.length; i--;) {
      if (!intro[introNames[i]]) {
        allVisited = false;
        break;
      }
    }
    return allVisited;
  }

  /**
   * Register an intro guide
   *
   * @method  register
   * @author  Fritz Lekschas
   * @date    2016-09-16
   * @param   {String}  name  Name of the intro guide.
   */
  function register (name) {
    intro[name] = false;
  }

  /**
   * Save when a user has completely visited at a intro guide
   *
   * @method  completed
   * @author  Fritz Lekschas
   * @date    2016-09-16
   * @param   {String}  name  Name of the intro guide.
   */
  function completed (name) {
    if (typeof intro[name] === 'boolean') {
      intro[name] = true;
      if (checkIntros() && !celebrated) {
        celebrationCallback();
        celebrated = true;
      }
    }
  }

  /**
   * Register celebration callback
   *
   * @method  celebrate
   * @author  Fritz Lekschas
   * @date    2016-09-30
   * @param   {Function}  callback  Function to be called when it's time to
   *   celebrate.
   */
  function celebrate (callback) {
    celebrationCallback = callback;
  }

  return {
    completed: completed,
    celebrate: celebrate,
    register: register
  };
}

angular
  .module('refineryDashboard')
  .factory('dashboardIntroSatoriEasterEgg', [IntroSatoriEasterEgg]);
