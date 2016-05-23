'use strict';

/**
 * RefineryUrlRouterProvider Class
 *
 * @method  RefineryUrlRouterProvider
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
 * @class
 * @param  {Object}    $window            Angular's window object.
 * @param  {Object}    $urlRouterProvider UI-Router's $urlRouterProvider.
 * @param  {Object}    _                  Lodash.
 * @param  {Function}  locationTest       Function for testing if the current
 *   location matches a given path.
 */
function RefineryUrlRouterProvider (
  $window, $urlRouterProvider, _, locationTest) {
  this.$urlRouterProvider = $urlRouterProvider;
  this.$window = $window;
  this._ = _;
  this.locationTest = locationTest;
}

/**
 * Default URL route initialization only when the location's path matches the
 * given path.
 *
 * @method  otherwise
 * @author  Fritz Lekschas
 * @date    2015-08-25
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
 * @param   {String}        url    Default route.
 * @param   {String|Array}  paths  Location paths under, which the state will be
 *   registered at. These paths should equal the exact pathname of
 *   `window.location`. If `regex` is `true` this parameter should be a regex
 *   string.
 * @param   {Boolean}       regex  If `true` it assumes that all `paths` are
 *   regex strings.
 * @return  {Object}               Return `this` for chaining.
 */
RefineryUrlRouterProvider.prototype.otherwise = function (url, paths, regex) {
  var pathname = this.$window.location.pathname;

  if (this._.isArray(paths)) {
    for (var i = paths.length; i--;) {
      if (this._.isObject(paths[i])) {
        if (this.locationTest(pathname, paths[i].path, paths[i].regex)) {
          this.$urlRouterProvider.otherwise(url);
        }
      } else {
        if (this.locationTest(pathname, paths[i], regex)) {
          this.$urlRouterProvider.otherwise(url);
        }
      }
    }
  } else {
    if (this.locationTest(pathname, paths, regex)) {
      this.$urlRouterProvider.otherwise(url);
    }
  }

  return this;
};

/**
 * Return $urlRouterProvider's `$.get` function.
 *
 * @method  $get
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
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
    '_',
    'locationTest',
    function ($windowProvider, $urlRouterProvider, _, locationTest) {
      return new RefineryUrlRouterProvider(
        $windowProvider.$get(), $urlRouterProvider, _, locationTest
      );
    }
  ]);
