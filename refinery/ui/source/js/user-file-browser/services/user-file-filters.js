(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileFiltersService', userFileFiltersService);

  userFileFiltersService.$inject = [];

  function userFileFiltersService () {
    var userFileFilters = {}; // TODO
    return userFileFilters;
  }
})();
