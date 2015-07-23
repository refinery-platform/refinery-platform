/**
 * RefineryStateProvider Class
 * @param {object} $window        Angular's window object.
 * @param {object} $stateProvider UI-Router's $stateProvider.
 */
function RefineryStateProvider ($window, $stateProvider) {
  this.$window = $window;
  this.$stateProvider = $stateProvider;
}

/**
 * State initialization only when the location's path matches the given path.
 *
 * @description
 * Wraps the original $stateProvider's `state` method, to restrict state
 * registration to a given path. This is useful when using Angular together with
 * another non-JavaScript framework that has it's own URL router.
 *
 * This way we can specify the same route multiple times but restrict it to a
 * given path.
 *
 * @example
 * <pre>
 * var app = angular.module('app', ['refineryRouter']);
 *
 * var user = angular.module('app.user', []);
 *
 * user.config(function (refineryStateProvider) {
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/user/edit.html',
 *        controller: 'UserCtrl as user'
 *      },
 *      '/users/');
 * });
 *
 * var group = angular.module('app.group', []);
 *
 * group.config(function (refineryStateProvider) {
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/group/edit.html',
 *        controller: 'GroupCtrl as group'
 *      },
 *      '/groups/');
 * });
 * </pre>
 *
 * @param  {string} name  $stateProvider's state name.
 * @param  {object} state $stateProvider's state object.
 * @param  {string} path  Path under which the state will be registered.
 * @return {object}       Return `this` for chaining.
 */
RefineryStateProvider.prototype.state = function (name, state, path) {
  if (this.$window.location.pathname === path) {
    this.$stateProvider.state(name, state);
  }
  return this;
};

/**
 * Return $stateProvider's `$.get` function.
 * @return {function} Super $.get()
 */
RefineryStateProvider.prototype.$get = function () {
  return this.$stateProvider.$get;
};

angular
  .module('refineryRouter')
  .provider('refineryState', [
    '$windowProvider',
    '$stateProvider',
    function ($windowProvider, $stateProvider) {
      var $window = $windowProvider.$get();

      return new RefineryStateProvider($window, $stateProvider);
    }
  ]);
