'use strict';

function timeoutablePromise ($q, $timeout) {
  return function (promise, time) {
    var deferred = $q.defer();

    $timeout(function () {
      deferred.reject('Not resolved within ' + time + 'ms.');
    }, time);

    promise.then(function (results) {
      deferred.resolve(results);
    }).catch(function (e) {
      deferred.reject(e);
    });

    return deferred.promise;
  };
}

angular
  .module('refineryApp')
  .factory('timeoutablePromise', ['$q', '$timeout', timeoutablePromise]);
