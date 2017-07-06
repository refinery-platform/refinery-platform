(function () {
  'use strict';
  angular
    .module('refineryApp')
    .factory('gridOptionsService', gridOptionsService);

  gridOptionsService.$inject = [];

  function gridOptionsService () {
    var gridOptions = {
      useExternalSorting: true,
      selectionRowHeaderWidth: 35,
      rowHeight: 35
    };
    return gridOptions;
  }
})();
