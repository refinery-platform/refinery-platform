function AppCtrl ($, $rootScope, $timeout, $window, _, pubSub, settings) {
  this.$window = $window;
  this.$ = $;
  this._ = _;
  this.pubSub = pubSub;
  this.settings = settings;

  this.$(this.$window).on(
    'resize orientationchange',
    this._.debounce(
      function () {
        this.pubSub.trigger('resize');
      }.bind(this),
      this.settings.debounceWindowResize
    )
  );

  $rootScope.$on('$stateChangeSuccess', function (e, toState, toParams, fromState, fromParams) {
    $timeout(function () {
      if (fromState.url !== '^' && window.ga) {
        ga(
          'send',
          'pageview',
          $window.location.pathname + $window.location.hash
        );
      }
    }, 0);
  });

}

AppCtrl.prototype.globalClick = function ($event) {
  this.pubSub.trigger('globalClick', $event);
};

angular
  .module('refineryApp')
  .controller('AppCtrl', [
    '$',
    '$rootScope',
    '$timeout',
    '$window',
    '_',
    'pubSub',
    'settings',
    AppCtrl
  ]);
