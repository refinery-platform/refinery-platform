(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .service('activeNodeService', activeNodeService);

  function activeNodeService () {
    var vm = this;
    vm.activeNodeRow = {}; // ui-grid node which is selected, shared btwn modules
    vm.selectionObj = {}; // ui-grid maintains checkboxes for popover
    // selection {groupId: {inputFileTypeUuid_1: { nodeUuid: booleanValue }}}
  }
})();
