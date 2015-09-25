angular
  .module('refineryApp')
  .config([
    '$urlRouterProvider',
    function ($urlRouterProvider) {
      /*
       * Force URLs to be caseinsensitive.
       * Append a trailing slash if there is none.
       */
      $urlRouterProvider.rule(function ($injector, $location) {
        var path = $location.path(),
            normalized = path.toLowerCase();

        if (normalized.slice(-1) !== '/') {
          normalized += '/';
        }

        if (path !== normalized) {
          return normalized;
        }
      });
    }
  ]);
