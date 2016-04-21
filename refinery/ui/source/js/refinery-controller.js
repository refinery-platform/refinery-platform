'use strict';

function AppCtrl ($, $rootScope, $timeout, $window, _, pubSub, settings) {
  this.$window = $window;
  this.jqWindow = $($window);
  this.$ = $;
  this._ = _;
  this.pubSub = pubSub;
  this.settings = settings;

  if (settings.djangoApp.repositoryMode) {
    this.repoMode = true;
  }

  this.jqWindow.on(
    'resize orientationchange',
    this._.debounce(
      function () {
        this.pubSub.trigger('resize', {
          width: this.jqWindow.width(),
          height: this.jqWindow.height()
        });
      }.bind(this),
      this.settings.debounceWindowResize
    )
  );

  $rootScope.$on(
    '$stateChangeSuccess',
    function (e, toState, toParams, fromState) {
      $timeout(function () {
        if (fromState.url !== '^' && $window.ga) {
          $window.ga(
            'send',
            'pageview',
            $window.location.pathname + $window.location.hash
          );
        }
      }, 0);
    }
  );

  $rootScope.$on('$reloadlessStateChangeSuccess', function () {
    $timeout(function () {
      if ($window.ga) {
        var hash = $window.location.hash;
        var path = $window.location.pathname;

        if (hash.length > 2) {
          path = path + hash;
        }

        $window.ga(
          'send',
          'pageview',
          path
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
