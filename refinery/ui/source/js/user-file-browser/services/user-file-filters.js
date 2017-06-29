(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileFiltersService', userFileFiltersService);

  userFileFiltersService.$inject = [];

  function userFileFiltersService () {
    var userFileFilters = {};
    return userFileFilters;
  }
})();
