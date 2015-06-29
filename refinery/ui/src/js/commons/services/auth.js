angular
  .module('refineryApp')
  .factory('authService', ['$q', '$resource', 'settings', 'sessionService',
    function ($q, $resource, settings, sessionService) {
      var auth = {},
          authLastCheck = 0;

      /**
       * [checkUserStatus description]
       * @return {[type]} [description]
       */
      function checkUserStatus () {
        var query = $resource(
              settings.appRoot + settings.refineryApi + '/user_authentication/check/',
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
