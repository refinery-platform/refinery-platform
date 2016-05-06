'use strict';

function refineryAppConfig (
  $httpProvider, $logProvider, $urlRouterProvider, settings
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
}

angular
  .module('refineryApp')
  .config([
    '$httpProvider',
    '$logProvider',
    '$urlRouterProvider',
    'settings',
    refineryAppConfig
  ]);
