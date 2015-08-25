/**
 * RefineryStateProvider Class
 *
 * @method  RefineryStateProvider
 * @author  Fritz Lekschas
 * @date    2015-08-25
 *
 * @class
 * @param  {Object}  $window         Angular's window object.
 * @param  {Object}  $stateProvider  UI-Router's $stateProvider.
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
 * http://sub.domain.tld:port/data_sets//#/edit
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
 *      '^\/data_sets\/.*\/$');
 * });
 * </pre>
 *
 * @param   {String}   name   $stateProvider's state name.
 * @param   {Object}   state  $stateProvider's state object.
 * @param   {String}   path   Location path under which the state will be
 *   registered. This path should equal the exact pathname of `window.location`.
 *   If `regex` is `true` this parameter should be a regex string.
 * @param   {Boolean}  regex  If true it assumes that `path` is a regex string.
 * @return  {Object}          Return `this` for chaining.
 */
RefineryStateProvider.prototype.state = function (name, state, path, regex) {
  var pathname = this.$window.location.pathname;

  if ((regex && new RegExp(path).test(pathname)) || pathname === path) {
    this.$stateProvider.state(name, state);
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
    function ($windowProvider, $stateProvider) {
      var $window = $windowProvider.$get();

      return new RefineryStateProvider($window, $stateProvider);
    }
  ]);
