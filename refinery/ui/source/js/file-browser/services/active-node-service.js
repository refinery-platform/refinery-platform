(function () {
  'use strict';

  angular.module('refineryFileBrowser')
    .service('activeNodeService', activeNodeService);

  function activeNodeService () {
    var vm = this;
    vm.activeNodeRow = {}; // ui-grid node which is selected, shared btwn modules
    vm.selectionObj = {}; // ui-grid maintains checkboxes for popover
    // selection {groupId: {inputFileTypeUuid_1: { nodeUuid: booleanValue }}}

    /**
     * When a group is removed/clear, this will deselect all associated nodes
     * from the ui-grid selection obj
     * @param {str} groupId - string with group Id ex, '[0,0,0]'
     * */
    vm.deselectGroupFromSelectionObj = function (groupId) {
      angular.forEach(vm.selectionObj[groupId], function (inputObj, inputUuid) {
        angular.forEach(inputObj, function (selectionValue, nodeUuid) {
          vm.selectionObj[groupId][inputUuid][nodeUuid] = false;
        });
      });
    };
  }
})();
