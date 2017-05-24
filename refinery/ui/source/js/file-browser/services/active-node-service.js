(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .service('activeNodeService', activeNodeService);

  function activeNodeService () {
    var vm = this;
    vm.activeNodeRow = {}; // ui-grid node which is selected, shared btwn modules
  }
})();
