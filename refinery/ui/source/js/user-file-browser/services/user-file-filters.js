(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('userFileFiltersService', userFileFiltersService);

  userFileFiltersService.$inject = [];

  function userFileFiltersService () {
    // tracks selected fields by their internal name
    var userFileFilters = {};
    return userFileFilters;
  }
})();
