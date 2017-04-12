(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
  ];


  function NodeSelectionPopoverCtrl (
    $scope,
    _,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var vm = this;
    vm.inputFileTypes = [];
    vm.currentPosition = fileService.currentPosition;
    vm.currentTypes = fileService.currentTypes;
    vm.selectNode = selectNode;
    vm.selectionObj = {};
    vm.toolInputGroups = fileService.toolInputGroups;

  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function selectNode (inputUuid) {
      fileService.setToolInputGroup(inputUuid, vm.selectionObj);
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
        return fileService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileService.inputFileTypes;
      }
    );

    $scope.$watchCollection(
      function () {
        return fileService.currentPosition;
      },
      function () {
        vm.currentPosition = fileService.currentPosition;
        vm.currentTypes = fileService.currentTypes;
      }
    );
  }
})();
