'use strict';

function refineryAppConfig ($logProvider, $urlRouterProvider, settings) {
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
}

angular
  .module('refineryApp')
  .config([
    '$logProvider', '$urlRouterProvider', 'settings', refineryAppConfig
  ]);
