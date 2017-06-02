(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('InputGroupsColumnPopoverCtrl', InputGroupsColumnPopoverCtrl);

  InputGroupsColumnPopoverCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'activeNodeService'
  ];

  function InputGroupsColumnPopoverCtrl (
    $scope,
    _,
    fileRelationshipService,
    activeNodeService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = activeNodeService;
    var vm = this;
    vm.activeNode = nodeService.activeNodeRow; // ui-grid row which is engaged
    vm.attributes = fileService.attributesObj; // contains the data attributes
    vm.currentGroup = fileService.currentGroup; // group indices ex: [0, 0]
    /** current group's data structure for each level ex:[ 'Pair','List'] **/
    vm.currentTypes = fileService.currentTypes;
    // selectedNodes ordered by group indicies
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
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
        vm.groupCollection = fileService.groupCollection;
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
        return fileService.currentGroup;
      },
      function () {
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
        vm.nodeSelection = fileService.nodeSelectCollection;
      }
    );
  }
})();
