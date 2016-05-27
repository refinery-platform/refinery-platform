'use strict';

function UrlPatternNoStringException (message, urlPattern) {
  this.message = (
    message || 'The provided URL pattern (' + urlPattern + ') is no string'
  );
  this.name = 'UrlPatternNoStringException';
}

// Angular monkey patch to address removal of trailing slashes by $resource:
// https://github.com/angular/angular.js/issues/992
angular
  .module('ngResource')
  .config(['$provide', '$httpProvider', function ($provide, $httpProvider) {
    $provide.decorator('$resource', ['$delegate', function ($delegate) {
      return function () {
        if (arguments.length > 0) {  // URL
          try {
            arguments[0] = arguments[0].replace(/\/$/, '\\/');
          } catch (error) {
            // Somehow the URL pattern is not a string
            throw new UrlPatternNoStringException(null, arguments[0]);
          }
        }

        if (arguments.length > 2) {  // Actions
          angular.forEach(arguments[2], function (action) {
            if (action && action.url) {
              action.url = action.url.replace(/\/$/, '\\/');
            }
          });
        }

        return $delegate.apply($delegate, arguments);
      };
    }]);

    $provide.factory('resourceEnforceSlashInterceptor', function () {
      return {
        request: function (config) {
          config.url = config.url.replace(/[\/\\]+$/, '/');
          return config;
        }
      };
    });

    $httpProvider.interceptors.push('resourceEnforceSlashInterceptor');
  }]);
