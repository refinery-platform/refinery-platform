'use strict';

/**
 * Returns full path to a static resource by pre-pending STATIC_URL
 */

angular
  .module('refineryApp')
  .factory('staticUrlService', ['settings',
    function (settings) {
      return {
        create: function (relativePath) {
          return settings.staticUrl + relativePath;
        }
      };
    }
  ]);
