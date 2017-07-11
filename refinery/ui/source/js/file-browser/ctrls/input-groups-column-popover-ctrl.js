(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('InputGroupsColumnPopoverCtrl', InputGroupsColumnPopoverCtrl);

  InputGroupsColumnPopoverCtrl.$inject = [
    '$scope',
    '_',
    'activeNodeService',
    'fileRelationshipService'
  ];

  function InputGroupsColumnPopoverCtrl (
    $scope,
    _,
    activeNodeService,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = activeNodeService;
    var vm = this;
    vm.activeNode = nodeService.activeNodeRow; // ui-grid row which is engaged
    vm.currentGroup = fileService.currentGroup;
    vm.groupCollection = fileService.groupCollection;
    vm.inputFileTypes = fileService.inputFileTypes; // current tool's inputFileTypes
    vm.inputFileTypeColor = fileService.inputFileTypeColor;
    // selectedNodes ordered by group indicies
    vm.nodeSelection = fileService.nodeSelectCollection;
  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // When selected tools are update, so are their inputFileTypes
    $scope.$watchCollection(
      function () {
        return fileService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileService.inputFileTypes;
        vm.inputFileTypeColor = fileService.inputFileTypeColor;
      }
    );
    // When user selects/deselects row
    $scope.$watch(
      function () {
        return nodeService.activeNodeRow;
      },
      function () {
        vm.activeRow = nodeService.activeNodeRow;
      }
    );
    // When user changes the group selection from the control panel
    $scope.$watchCollection(
      function () {
        return fileService.groupCollection;
      },
      function () {
        vm.nodeSelection = fileService.nodeSelectCollection;
        vm.groupCollection = fileService.groupCollection;
        vm.currentGroup = fileService.currentGroup;
      }
    );
  }
})();
