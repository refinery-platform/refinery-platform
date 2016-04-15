'use strict';

angular
  .module('errors', [])
  .factory('errors', ['$rootScope', function ($rootScope) {
    var errors = [];

    function broadcast (errId) {
      /*
       * Sends out an event following the scheme: error:errorType together with
       * the error ID so that others can get the data if interested.
       */
      $rootScope.$broadcast('error:' + errors[errId].type, errId);
    }

    function get (errId) {
      return errors[errId];
    }

    function log (error) {
      errors.push(error);

      // Return error ID
      return errors.length - 1;
    }

    function catchErr (type, message) {
      return function (e) {
        var error = {
          message: message,
          reason: e,
          type: type
        };

        broadcast(log(error));
      };
    }

    return {
      get: get,
      catch: catchErr
    };
  }]);
