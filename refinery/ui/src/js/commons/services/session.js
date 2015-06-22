angular
  .module('refineryApp')
  .factory('sessionService', ['$q', '$resource', 'settings',
    function ($q, $resource, settings) {
      var session = {},
          sessionData = {
            date: 0
          };

      session.create = function (data) {
        var now = new Date().getTime();

        sessionData.date = now;
        sessionData.userId = data.userId;
        sessionData.isAdmin = data.isAdmin;
      };

      session.get = function (prop) {
        if (sessionData.hasOwnProperty(prop)) {
          return sessionData.prop;
        }
        return;
      };

      session.destroy = function () {
        sessionData = {
          date: 0
        };
      };

      return session;
    }
  ]);
