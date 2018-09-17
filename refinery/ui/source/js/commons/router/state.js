'use strict';

/**
 * RefineryStateProvider Class
 *
 * @method  RefineryStateProvider
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
 * @class
 * @param  {Object}    $window         Angular's window object.
 * @param  {Object}    $stateProvider  UI-Router's $stateProvider.
 * @param  {Object}    _               Lodash.
 * @param  {Function}  locationTest    Function for testing if the current
 *   location matches a given path.
 */
function RefineryStateProvider ($window, $stateProvider, _, locationTest) {
  this.$stateProvider = $stateProvider;
  this.$window = $window;
  this._ = _;
  this.locationTest = locationTest;
}

/**
 * State initialization only when the location's path matches the given path.
 *
 * @description
 * Wraps the original $stateProvider's `state` method, to restrict state
 * registration to a given location path. This is useful when using Angular
 * together with another non-JavaScript framework that has it's own URL router.
 * It is important tht that `path` equals the pathname of `window.location`,
 * thus a leading **and** trailing slash are mandatory!
 *
 * This way we can specify the same route multiple times but restrict it to a
 * given path.
 *
 * @method  state
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
 * @example
 * We want to have an _edit_ state under the URL `.../#/edit` for two
 * different locations: `/users/` and `/groups/`. The final URLs would look like
 * this:
 * http://sub.domain.tld:port/users/#/edit
 * http://sub.domain.tld:port/groups/#/edit
 * http://sub.domain.tld:port/provenance//#/edit
 *
 * <pre>
 * var app = angular.module('app', ['refineryRouter']);
 *
 * var users = angular.module('app.users', []);
 *
 * users.config(function (refineryStateProvider) {
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/user/edit.html',
 *        controller: 'UsersCtrl as users'
 *      },
 *      '/users/');
 * });
 *
 * var groups = angular.module('app.groups', []);
 *
 * groups.config(function (refineryStateProvider) {
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/group/edit.html',
 *        controller: 'GroupsCtrl as groups'
 *      },
 *      '/groups/');
 * });
 *
 * var dataSets = angular.module('app.dataSets', []);
 *
 * dataSets.config(function (refineryStateProvider) {
 *  refineryStateProvider
 *    .state(
 *      'edit',
 *      {
 *        url: '/edit',
 *        templateUrl: '/static/partials/group/edit.html',
 *        controller: 'DataSetsCtrl as dataSets'
 *      },
 *      '^\/provenance\/.*\/$', true);
 * });
 * </pre>
 *
 * @param   {String}        name   $stateProvider's state name.
 * @param   {Object}        state  $stateProvider's state object.
 * @param   {String|Array}  paths  Location paths under, which the state will be
 *   registered at. These paths should equal the exact pathname of
 *   `window.location`. If `regex` is `true` this parameter should be a regex
 *   string.
 * @param   {Boolean}       regex  If `true` it assumes that all `paths` are
 *   regex strings. If `paths` is an array of objects with a path specific
 *   regex attribite this variable will be overwritten.
 * @return  {Object}               Return `this` for chaining.
 */
RefineryStateProvider.prototype.state = function (name, state, paths, regex) {
  var pathname = this.$window.location.pathname;

  if (this._.isArray(paths)) {
    for (var i = paths.length; i--;) {
      if (this._.isObject(paths[i])) {
        if (this.locationTest(pathname, paths[i].path, paths[i].regex)) {
          this.$stateProvider.state(name, state);
        }
      } else {
        if (this.locationTest(pathname, paths[i], regex)) {
          this.$stateProvider.state(name, state);
        }
      }
    }
  } else {
    if (this.locationTest(pathname, paths, regex)) {
      this.$stateProvider.state(name, state);
    }
  }

  return this;
};

/**
 * Return $stateProvider's `$.get` function.
 *
 * @method  $get
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
 * @return  {Function}  Super `$.get()` method.
 */
RefineryStateProvider.prototype.$get = function () {
  return this.$stateProvider.$get;
};

angular
  .module('refineryRouter')
  .provider('refineryState', [
    '$windowProvider',
    '$stateProvider',
    '_',
    'locationTest',
    function ($windowProvider, $stateProvider, _, locationTest) {
      return new RefineryStateProvider(
        $windowProvider.$get(), $stateProvider, _, locationTest
      );
    }
  ]);
