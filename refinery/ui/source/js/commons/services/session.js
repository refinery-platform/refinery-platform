'use strict';

angular
  .module('refineryApp')
  .factory('sessionService', [
    function () {
      var session = {};
      var sessionData = {
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
          return sessionData[prop];
        }
        return undefined;
      };

      session.destroy = function () {
        sessionData = {
          date: 0
        };
      };

      return session;
    }
  ]);
