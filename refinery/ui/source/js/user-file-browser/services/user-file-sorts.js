(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileSortsService', userFileSortsService);

  userFileSortsService.$inject = [];

  function userFileSortsService () {
    var userFileSorts = {
      fields: []
    };
    return userFileSorts;
  }
})();
