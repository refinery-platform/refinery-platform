angular
  .module('refineryApp')
  .factory('authService', ['$q', '$resource', 'settings', 'sessionService',
    function ($q, $resource, settings, sessionService) {
      var auth = {},
          authLastCheck = 0;

      /**
       * Check whether a user is authenticated or not.
       *
       * @method  checkUserStatus
       * @author  Fritz Lekschas
       * @date    2015-10-21
       *
       * @return  {Object}  Angular promise
       */
      function checkUserStatus () {
        var query = $resource(
              settings.appRoot + settings.refineryApi + '/user_authentication/',
              {
                format: 'json'
              },
              {
                query: {
                  method: 'GET',
                  isArray: false,
                }
              }
            ).query();

        return query.$promise;
      }

      function createSession () {
        var userStatus = checkUserStatus();

        return userStatus
          .then(
            // Success
            function (response) {
              sessionService.create({
                userId: response.id,
                isAdmin: response.is_admin,
              });
            }
          );
      }

      auth.isAuthenticated = function () {
        var now = new Date().getTime(),
            session;

        if (now - sessionService.get('date') > settings.authThrottling) {
          session = createSession();
        } else {
          session = $q.when();
        }

        return session.then(
          // Success
          function () {
            return sessionService.get('userId') >= 0;
          }
        );
      };

      auth.isAdmin = function () {
        var now = new Date().getTime(),
            session;

        if (now - sessionService.get('date') > settings.authThrottling) {
          session = createSession();
        } else {
          session = $q.when();
        }

        return session.then(
          // Success
          function () {
            return sessionService.get('isAdmin');
          }
        );
      };

      return auth;
    }
  ]);
