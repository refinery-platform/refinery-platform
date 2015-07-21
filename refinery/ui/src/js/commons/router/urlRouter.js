function RefineryUrlRouterProvider ($window, $urlRouterProvider) {
  this.$window = $window;
  this.$urlRouterProvider = $urlRouterProvider;
}

/**
 * State initialization only when the location path matches the given one
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
 * var app = angular.module('app', ['refineryState']);
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
 * @param  {[type]} state $stateProvider's state object.
 * @param  {[type]} path  Path under which the state should be registered
 */
RefineryUrlRouterProvider.prototype.otherwise = function (url, path) {
  if (this.$window.location.pathname === path) {
    this.$urlRouterProvider.otherwise(url);
  }
};

/**
 * Return $urlRouterProvider's `$.get` function.
 * @return {function} Super $.get()
 */
RefineryUrlRouterProvider.prototype.$get = function () {
  return this.$urlRouterProvider.$get;
};

angular
  .module('refineryRouter')
  .provider('refineryUrlRouter', [
    '$windowProvider',
    '$urlRouterProvider',
    function ($windowProvider, $urlRouterProvider) {
      var $window = $windowProvider.$get();

      return new RefineryUrlRouterProvider($window, $urlRouterProvider);
    }
  ]);
