/**
 * RefineryUrlRouterProvider Class
 * @param {object} $window            Angular's window object.
 * @param {object} $urlRouterProvider UI-Router's $urlRouterProvider.
 */
function RefineryUrlRouterProvider ($window, $urlRouterProvider) {
  this.$window = $window;
  this.$urlRouterProvider = $urlRouterProvider;
}

/**
 * Default URL route initialization only when the location's path matches the
 * given path.
 *
 * @description
 * Wraps the original $urlRouterProvider's `otherwise` method, to restrict
 * default URL rewriting to a given path. This is useful when using Angular
 * together with another non-JavaScript framework that has it's own URL router.
 *
 * This way we can specify the same default route multiple times without
 * interference on other paths.
 *
 * @example
 * <pre>
 * var app = angular.module('app', ['refineryRouter']);
 *
 * var user = angular.module('app.user', []);
 *
 * user.config(function (refineryStateProvider, refineryUrlRouterProvider) {
 *  refineryStateProvider
 *    .state(
 *      'list',
 *      {
 *        url: '/',
 *        templateUrl: '/static/partials/user/list.html',
 *        controller: 'UserCtrl as user'
 *      },
 *      '/users/');
 *
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/user/edit.html',
 *        controller: 'UserCtrl as user'
 *      },
 *      '/users/');
 *
 *  refineryStateProvider
 *    .state(
 *      'delete',
 *      {
 *        url: '/delete',
 *        templateUrl: '/static/partials/user/delete.html',
 *        controller: 'UserCtrl as user'
 *      },
 *      '/users/');
 *
 *  refineryUrlRouterProvider
 *    .otherwise(
 *      '/',
 *      '/users/'
 *    );
 * });
 * </pre>
 *
 * @param  {string} url  Default route.
 * @param  {strign} path Path under which the default route will be registered.
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
