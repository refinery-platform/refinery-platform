(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    'fileRelationshipService'
  ];


  function NodeSelectionPopoverCtrl (
    $scope,
    fileRelationshipService
  ) {
    var vm = this;
    vm.inputFileTypes = [];
    vm.selectNode = selectNode;
    vm.selectionObj = {};
    vm.toolInputGroups = {};

  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function selectNode (selectionUuid, inputSlotUuid) {
      if (vm.selectionObj[selectionUuid]) {
        vm.toolInputGroups[inputSlotUuid] = selectionUuid;
      } else {
        // remove property
        delete vm.toolInputGroups[inputSlotUuid];
      }
      console.log(vm.selectionObj);
      console.log(vm.toolInputGroups);
    }

  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // MOVE TO A SEPERATE DIRECTIVE
    $scope.$watchCollection(
      function () {
        return fileRelationshipService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileRelationshipService.inputFileTypes;
      }
    );
  }
})();
