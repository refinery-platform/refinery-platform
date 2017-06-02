'use strict';

function refineryAppConfig (
  $compileProvider,
  $httpProvider,
  $logProvider,
  $provide,
  $sceDelegateProvider,
  $urlRouterProvider,
  settings,
  uiSelectConfig,
  localStorageServiceProvider
) {
  /*
   * Force URLs to be caseinsensitive.
   * Append a trailing slash if there is none.
   */
  $urlRouterProvider.rule(function ($injector, $location) {
    var path = $location.path();
    var normalized = path.toLowerCase();

    if (normalized.slice(-1) !== '/') {
      normalized += '/';
    }

    if (path !== normalized) {
      return normalized;
    }

    return undefined;
  });

  /*
   * Set debug logger
   */
  $logProvider.debugEnabled(settings.djangoApp.debug);

  /*
   * Use Django XSRF/CSRF lingo to enable communication with API.
   */
  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

  /*
   * Performance enhancement
   */
  $compileProvider.debugInfoEnabled(settings.djangoApp.debug);
  $httpProvider.useApplyAsync(true);

  // http://stackoverflow.com/q/11252780
  $provide.decorator('$rootScope', ['$delegate', function ($delegate) {
    Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
      value: function (name, listener) {
        var unsubscribe = $delegate.$on(name, listener);
        this.$on('$destroy', unsubscribe);
      },
      enumerable: false
    });
    return $delegate;
  }]);

  // For ui-select, known bug. Should be fixed in the next release
  // https://github.com/angular-ui/ui-select/issues/1672
  uiSelectConfig.removeSelected = false;

  // Set unique prefix for the local storage
  localStorageServiceProvider.setPrefix(
    'refinery' + settings.djangoApp.refineryInstanceName
  );

  $sceDelegateProvider.resourceUrlWhitelist([
    'self',
    settings.djangoApp.staticUrl + '**'  // allow loading assets from S3
  ]);
}

angular
  .module('refineryApp')
  .config([
    '$compileProvider',
    '$httpProvider',
    '$logProvider',
    '$provide',
    '$sceDelegateProvider',
    '$urlRouterProvider',
    'settings',
    'uiSelectConfig',
    'localStorageServiceProvider',
    refineryAppConfig
  ]);
